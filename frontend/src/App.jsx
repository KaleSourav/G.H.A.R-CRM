import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Layouts & Pages
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LeadsPage from './pages/LeadsPage';
import LeadDetailPage from './pages/LeadDetailPage';
import PipelinePage from './pages/PipelinePage';
import TasksPage from './pages/TasksPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import TeamPage from './pages/TeamPage';
import SettingsPage from './pages/SettingsPage';
import LeadCapturePage from './pages/LeadCapturePage';

// ── Route Guards ───────────────────────────────────────────────────────────
function RequireAuth({ children }) {
  const { session, loading } = useAuth();
  if (loading) return <AppLoader />;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function RequireRole({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <AppLoader />;
  if (!user || !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppLoader() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg)', gap: '1rem',
    }}>
      <div style={{
        width: 48, height: 48,
        border: '3px solid rgba(245,158,11,0.2)',
        borderTop: '3px solid #F59E0B',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading G.H.A.R CRM...</p>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/capture" element={<LeadCapturePage />} />

      {/* Protected routes */}
      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="leads/:id" element={<LeadDetailPage />} />
        <Route path="pipeline" element={<PipelinePage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="projects" element={
          <RequireRole roles={['admin', 'manager']}>
            <ProjectsPage />
          </RequireRole>
        } />
        <Route path="projects/:id" element={
          <RequireRole roles={['admin', 'manager']}>
            <ProjectDetailPage />
          </RequireRole>
        } />
        <Route path="team" element={
          <RequireRole roles={['admin', 'manager']}>
            <TeamPage />
          </RequireRole>
        } />
        <Route path="settings" element={
          <RequireRole roles={['admin']}>
            <SettingsPage />
          </RequireRole>
        } />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--color-surface-2)',
                color: 'var(--text-primary)',
                border: '1px solid var(--color-border)',
                borderRadius: '10px',
                fontSize: '0.875rem',
                fontFamily: 'Inter, sans-serif',
              },
              success: {
                iconTheme: { primary: '#10B981', secondary: 'var(--color-surface-2)' },
              },
              error: {
                iconTheme: { primary: '#EF4444', secondary: 'var(--color-surface-2)' },
              },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
