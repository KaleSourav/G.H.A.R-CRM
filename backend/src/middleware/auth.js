const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../supabaseAdmin');

/**
 * Middleware: verify Supabase JWT and attach user + role to req
 * Uses Supabase Admin to look up the full user record (role, org_id, etc.)
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];

    // Verify token with Supabase (this also validates expiry)
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Fetch full user profile from our users table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, org_id, name, email, role, manager_id, status')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ error: 'User profile not found. Contact admin.' });
    }

    if (profile.status !== 'active') {
      return res.status(403).json({ error: 'Account is inactive or suspended.' });
    }

    req.user = profile;
    req.orgId = profile.org_id;
    req.userRole = profile.role;
    next();
  } catch (err) {
    console.error('[Auth Middleware]', err.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

module.exports = { authenticate };
