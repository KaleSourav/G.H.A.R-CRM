import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Kanban, CheckSquare,
  Building2, UserCircle2, Settings, MoreHorizontal,
} from 'lucide-react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuth } from '../../context/AuthContext';

const BOTTOM_NAV = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard',
    roles: ['admin', 'manager', 'executive', 'front_office', 'finance'] },
  { icon: Users,           label: 'Leads',     path: '/leads',
    roles: ['admin', 'manager', 'executive', 'front_office'] },
  { icon: Kanban,          label: 'Pipeline',  path: '/pipeline',
    roles: ['admin', 'manager', 'executive'] },
  { icon: CheckSquare,     label: 'Tasks',     path: '/tasks',
    roles: ['admin', 'manager', 'executive'] },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  const filteredNav = BOTTOM_NAV.filter(
    item => !user?.role || item.roles.includes(user.role)
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', maxWidth: '100vw', width: '100%', overflowX: 'hidden', position: 'relative' }}>
      {/* Desktop Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(4, 8, 16, 0.72)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 199,
          }}
          className="mobile-overlay"
        />
      )}

      {/* Main content */}
      <div style={{
        flex: 1,
        minWidth: 0,
        width: 0,          /* flex child — grows via flex:1 but won't push past container */
        overflowX: 'hidden',
        marginLeft: 'var(--sidebar-width)',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        transition: 'margin-left 220ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <main className="main-content" style={{
          flex: 1,
          minWidth: 0,
          width: '100%',
          boxSizing: 'border-box',
          overflowX: 'hidden',
          padding: 'var(--content-pad)',
          marginTop: 'var(--topbar-height)',
          paddingBottom: 'calc(var(--bottom-nav-h) + var(--content-pad))',
        }}>
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="bottom-nav">
        {filteredNav.map(({ icon: Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `bottom-nav-item${isActive ? ' active' : ''}`
            }
          >
            <Icon size={20} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
        {/* Menu / More button for all roles on mobile */}
        <button
          className={`bottom-nav-item${sidebarOpen ? ' active' : ''}`}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle navigation menu"
        >
          <MoreHorizontal size={20} strokeWidth={1.8} />
          <span>Menu</span>
        </button>
      </nav>

      <style>{`
        @media (max-width: 768px) {
          .mobile-overlay { display: block; animation: fadeIn 200ms ease; }
        }
        @media (min-width: 769px) {
          .mobile-overlay { display: none; }
        }
      `}</style>
    </div>
  );
}
