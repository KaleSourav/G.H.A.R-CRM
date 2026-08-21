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
            background: 'rgba(0,0,0,0.6)',
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
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        transition: 'margin-left 200ms ease',
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
            <Icon size={20} strokeWidth={1.75} />
            <span>{label}</span>
          </NavLink>
        ))}
        {/* More button for admin/manager extra pages */}
        {['admin', 'manager'].includes(user?.role) && (
          <button
            className="bottom-nav-item"
            onClick={() => setSidebarOpen(true)}
          >
            <MoreHorizontal size={20} strokeWidth={1.75} />
            <span>More</span>
          </button>
        )}
      </nav>

      <style>{`
        @media (max-width: 768px) {
          .mobile-overlay { display: block; }
        }
        @media (min-width: 769px) {
          .mobile-overlay { display: none; }
        }
      `}</style>
    </div>
  );
}
