require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const leadsRouter = require('./routes/leads');
const tasksRouter = require('./routes/tasks');
const projectsRouter = require('./routes/projects');
const dashboardRouter = require('./routes/dashboard');
const teamRouter = require('./routes/team');
const authRouter = require('./routes/auth');
const { startSLATimer } = require('./services/slaTimer');

const app = express();
const PORT = process.env.PORT || 4000;

// ── Security middleware ──────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────
// Allow: localhost dev, all Vercel preview/prod URLs, explicit FRONTEND_URL list
const explicitOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
  : [];

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server / curl (no origin header)
    if (!origin) return callback(null, true);
    // Always allow localhost
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      return callback(null, true);
    }
    // Always allow any Vercel deployment (preview + production)
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    // Allow any explicitly listed origin
    if (explicitOrigins.includes(origin)) return callback(null, true);
    // Reject everything else — use null (not Error) to avoid 500
    return callback(null, false);
  },
  credentials: true,
}));

// ── Rate limiting ──────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ── Body parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging ───────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ── Health check ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ghar-crm-backend', timestamp: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/team', teamRouter);

// ── Public lead capture endpoint (no auth required) ───────────────────────
const { capturePublicLead } = require('./routes/leads');
app.post('/api/capture', capturePublicLead);

// ── 404 handler ──────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Error handler ─────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message, err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── Start server ──────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🏠 G.H.A.R CRM Backend running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    // Start SLA breach detection cron (every 5 minutes)
    startSLATimer();
    console.log('   SLA timer started (checks every 5 min)');
  });
}

module.exports = app;
