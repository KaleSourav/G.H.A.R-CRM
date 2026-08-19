import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  {
    icon: '📊', label: 'Dashboard', path: '/dashboard',
    roles: ['admin', 'manager', 'executive', 'front_office', 'finance'],
  },
  {
    icon: '👥', label: 'Leads', path: '/leads',
    roles: ['admin', 'manager', 'executive', 'front_office'],
  },
  {
    icon: '🗂️', label: 'Pipeline', path: '/pipeline',
    roles: ['admin', 'manager', 'executive'],
  },
  {
    icon: '✅', label: 'Tasks', path: '/tasks',
    roles: ['admin', 'manager', 'executive'],
  },
  {
    icon: '🏗️', label: 'Projects', path: '/projects',
    roles: ['admin', 'manager'],
  },
  {
    icon: '👤', label: 'Team', path: '/team',
    roles: ['admin', 'manager'],
  },
  {
    icon: '⚙️', label: 'Settings', path: '/settings',
    roles: ['admin'],
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
    navigate('/login');
  };

  const filteredNav = NAV_ITEMS.filter(item =>
    !user?.role || item.roles.includes(user.role)
  );

  return (
    <aside style={{
      position: 'fixed',
      left: 0, top: 0, bottom: 0,
      width: 'var(--sidebar-width)',
      background: 'var(--color-surface)',
      borderRight: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 200,
      transition: 'transform 250ms ease',
      transform: isOpen ? 'translateX(0)' : undefined,
    }}>
      {/* Logo */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}>
        <div style={{
          width: 36, height: 36,
          background: 'linear-gradient(135deg, #F59E0B, #D97706)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.1rem',
          fontWeight: '800',
          color: '#0F172A',
          flexShrink: 0,
          boxShadow: '0 0 16px rgba(245,158,11,0.3)',
        }}>G</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>
            G.H.A.R CRM
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Real Estate Suite
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0.75rem 0.75rem', overflowY: 'auto' }}>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {filteredNav.map(item => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                onClick={onClose}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.6rem 0.875rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(245,158,11,0.08)' : 'transparent',
                  border: isActive ? '1px solid rgba(245,158,11,0.15)' : '1px solid transparent',
                  transition: 'all 150ms ease',
                  textDecoration: 'none',
                })}
                className="nav-link"
              >
                <span style={{ fontSize: '1rem', lineHeight: 1 }}>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Phase 2 — coming soon section */}
        <div style={{ marginTop: '1.5rem', padding: '0 0.125rem' }}>
          <div style={{
            fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            padding: '0 0.75rem', marginBottom: '0.5rem',
          }}>Coming Soon</div>
          {[
            { icon: '🤝', label: 'Channel Partners' },
            { icon: '💬', label: 'WhatsApp' },
            { icon: '🤖', label: 'AI Insights' },
          ].map(item => (
            <div key={item.label} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.55rem 0.875rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              opacity: 0.5,
              cursor: 'not-allowed',
            }}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
              <span style={{
                marginLeft: 'auto', fontSize: '0.6rem', fontWeight: 600,
                background: 'var(--color-surface-2)',
                padding: '0.1rem 0.4rem', borderRadius: '4px',
                color: 'var(--text-muted)',
              }}>P2</span>
            </div>
          ))}
        </div>
      </nav>

      {/* User Profile */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid var(--color-border)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.625rem 0.75rem',
          borderRadius: '10px',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
        }}>
          {/* Avatar */}
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', fontWeight: 700, color: 'white',
            flexShrink: 0,
          }}>
            {getInitials(user?.name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name || 'Loading...'}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {user?.role?.replace('_', ' ')}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            style={{
              padding: '0.25rem',
              borderRadius: '6px',
              background: 'transparent',
              color: 'var(--text-muted)',
              border: 'none', cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'color 150ms',
            }}
          >
            🚪
          </button>
        </div>
      </div>

      <style>{`
        .nav-link:hover:not([aria-current="page"]) {
          background: var(--color-surface-2) !important;
          color: var(--text-primary) !important;
        }
        @media (max-width: 768px) {
          aside { transform: translateX(-100%); }
          aside[style*="translateX(0)"] { transform: translateX(0) !important; }
        }
      `}</style>
    </aside>
  );
}
