import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Kanban, CheckSquare,
  Building2, UserCircle2, Settings, LogOut,
  Handshake, MessageSquare, Sparkles, Sun, Moon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard',
    roles: ['admin', 'manager', 'executive', 'front_office', 'finance'] },
  { icon: Users,           label: 'Leads',     path: '/leads',
    roles: ['admin', 'manager', 'executive', 'front_office'] },
  { icon: Kanban,          label: 'Pipeline',  path: '/pipeline',
    roles: ['admin', 'manager', 'executive'] },
  { icon: CheckSquare,     label: 'Tasks',     path: '/tasks',
    roles: ['admin', 'manager', 'executive'] },
  { icon: Building2,       label: 'Projects',  path: '/projects',
    roles: ['admin', 'manager'] },
  { icon: UserCircle2,     label: 'Team',      path: '/team',
    roles: ['admin', 'manager'] },
  { icon: Settings,        label: 'Settings',  path: '/settings',
    roles: ['admin'] },
];

const COMING_SOON = [
  { icon: Handshake,      label: 'Channel Partners' },
  { icon: MessageSquare,  label: 'WhatsApp' },
  { icon: Sparkles,       label: 'AI Insights' },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  const filteredNav = NAV_ITEMS.filter(
    item => !user?.role || item.roles.includes(user.role)
  );

  return (
    <aside className="sidebar-container" style={{
      position: 'fixed',
      left: 0, top: 0, bottom: 0,
      width: 'var(--sidebar-width)',
      background: 'var(--color-surface)',
      borderRight: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 200,
      transition: 'transform 220ms ease, width 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms ease',
      overflowX: 'hidden',
    }}>

      {/* Logo */}
      <div style={{
        padding: '1.125rem 1.25rem',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        flexShrink: 0,
      }}>
        <div style={{
          width: 34, height: 34,
          background: 'linear-gradient(135deg, #E8A020, #C8891A)',
          borderRadius: '9px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.95rem',
          fontWeight: '800',
          color: '#080E1A',
          flexShrink: 0,
          boxShadow: '0 0 12px rgba(232,160,32,0.25)',
          letterSpacing: '-0.02em',
        }}>G</div>
        <div className="sidebar-brand-text" style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
            G.H.A.R CRM
          </div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.1rem' }}>
            Real Estate Suite
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0.625rem', overflowY: 'auto' }}>
        <div className="sidebar-section-title" style={{ marginBottom: '0.25rem', padding: '0 0.25rem 0.5rem', fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
          Navigation
        </div>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          {filteredNav.map(({ icon: Icon, label, path }) => (
            <li key={path}>
              <NavLink
                to={path}
                onClick={onClose}
                title={label}
                className={({ isActive }) =>
                  `sidebar-nav-link${isActive ? ' active' : ''}`
                }
              >
                <Icon size={16} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                <span className="sidebar-nav-label" style={{ whiteSpace: 'nowrap' }}>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Coming Soon */}
        <div className="sidebar-coming-soon" style={{ marginTop: '1.25rem' }}>
          <div className="sidebar-section-title" style={{
            fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            padding: '0 0.25rem', marginBottom: '0.375rem', whiteSpace: 'nowrap',
          }}>Coming Soon</div>
          {COMING_SOON.map(({ icon: Icon, label }) => (
            <div key={label} title={label} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.5rem 0.875rem',
              borderRadius: 'var(--radius)',
              fontSize: '0.825rem',
              color: 'var(--text-muted)',
              opacity: 0.5,
              cursor: 'not-allowed',
            }}>
              <Icon size={15} strokeWidth={1.75} style={{ flexShrink: 0 }} />
              <span className="sidebar-nav-label" style={{ whiteSpace: 'nowrap' }}>{label}</span>
              <span className="sidebar-p2-badge" style={{
                marginLeft: 'auto', fontSize: '0.58rem', fontWeight: 600,
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
        padding: '0.875rem',
        borderTop: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.625rem',
          padding: '0.5rem 0.625rem',
          borderRadius: 'var(--radius)',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
        }}>
          {/* Avatar */}
          <div style={{
            width: 30, height: 30,
            background: 'linear-gradient(135deg, #4F6FE8, #7C3AED)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.7rem', fontWeight: 700, color: 'white',
            flexShrink: 0,
          }}>
            {getInitials(user?.name)}
          </div>
          <div className="sidebar-user-text" style={{ flex: 1, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name || 'Loading...'}
            </div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {user?.role?.replace('_', ' ')}
            </div>
          </div>
          <button
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="sidebar-theme-btn"
            style={{
              padding: '0.3rem',
              borderRadius: '6px',
              background: 'transparent',
              color: 'var(--text-muted)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              transition: 'color 120ms',
              flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            {isDark ? <Sun size={15} strokeWidth={1.75} /> : <Moon size={15} strokeWidth={1.75} />}
          </button>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="sidebar-logout-btn"
            style={{
              padding: '0.3rem',
              borderRadius: '6px',
              background: 'transparent',
              color: 'var(--text-muted)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              transition: 'color 120ms',
              flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <LogOut size={15} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          aside.sidebar-container {
            transform: ${isOpen ? 'translateX(0)' : 'translateX(-100%)'};
            width: 240px !important;
            box-shadow: var(--shadow-xl);
          }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          aside.sidebar-container {
            width: 64px !important;
            overflow-x: hidden !important;
            z-index: 250 !important;
          }
          aside.sidebar-container:hover {
            width: 220px !important;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6) !important;
          }
          aside.sidebar-container:not(:hover) .sidebar-brand-text,
          aside.sidebar-container:not(:hover) .sidebar-nav-label,
          aside.sidebar-container:not(:hover) .sidebar-section-title,
          aside.sidebar-container:not(:hover) .sidebar-user-text,
          aside.sidebar-container:not(:hover) .sidebar-p2-badge,
          aside.sidebar-container:not(:hover) .sidebar-logout-btn {
            display: none !important;
          }
          aside.sidebar-container:not(:hover) .sidebar-nav-link {
            justify-content: center !important;
            padding: 0.6rem 0 !important;
          }
        }
      `}</style>
    </aside>
  );
}
