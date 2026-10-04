import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu, Bell, Plus, User, AlertTriangle,
  Clock, CheckCircle, RotateCcw, Download, Info,
  Sun, Moon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { authAPI } from '../../services/api';
import { formatRelative } from '../../utils/helpers';

const NOTIF_ICONS = {
  lead_assigned:       User,
  sla_breach:          AlertTriangle,
  task_due:            Clock,
  task_overdue:        AlertTriangle,
  lead_stage_changed:  RotateCcw,
  csv_import_complete: Download,
  system:              Info,
};

const NOTIF_COLORS = {
  lead_assigned:       'var(--color-accent)',
  sla_breach:          'var(--color-danger)',
  task_due:            'var(--color-warning)',
  task_overdue:        'var(--color-danger)',
  lead_stage_changed:  'var(--color-primary)',
  csv_import_complete: 'var(--color-success)',
  system:              'var(--color-info)',
};

export default function Topbar({ onMenuClick }) {
  const { user } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const { data } = await authAPI.notifications();
      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.read_status).length);
    } catch {}
  };

  const markAllRead = async () => {
    await authAPI.readAllNotifications();
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, read_status: true })));
  };

  const handleNotifClick = (notif) => {
    if (notif.lead_id) navigate(`/leads/${notif.lead_id}`);
    setShowNotifs(false);
  };

  return (
    <header style={{
      position: 'fixed',
      top: 0, right: 0,
      left: 'var(--sidebar-width)',
      height: 'var(--topbar-height)',
      paddingTop: 'var(--sat)',
      background: 'rgba(13,21,38,0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      paddingLeft: 'max(var(--content-pad), var(--sal))',
      paddingRight: 'max(var(--content-pad), var(--sar))',
      gap: '0.75rem',
      zIndex: 100,
      transition: 'left 220ms cubic-bezier(0.16, 1, 0.3, 1)',
    }}>

      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="btn btn-ghost btn-icon"
        id="mobile-menu-btn"
        aria-label="Open menu"
        style={{
          display: 'none',
          flexShrink: 0,
          width: 38,
          height: 38,
          padding: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Menu size={20} strokeWidth={2} />
      </button>

      {/* Brand / date area */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="topbar-date-desktop" style={{
          fontSize: '0.74rem',
          color: 'var(--text-muted)',
          letterSpacing: '0.03em',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          G.H.A.R CRM &nbsp;·&nbsp; {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <div className="topbar-brand-mobile" style={{
          display: 'none',
          alignItems: 'center',
          gap: '0.4rem',
        }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            G.H.A.R
          </span>
          <span style={{
            fontSize: '0.58rem',
            fontWeight: 700,
            background: 'var(--color-primary-dim)',
            color: 'var(--color-primary)',
            padding: '0.1rem 0.35rem',
            borderRadius: '4px',
            border: '1px solid rgba(232,160,32,0.25)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>CRM</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>

        {/* Quick add lead */}
        <button
          className="btn btn-primary btn-sm"
          onClick={() => navigate('/leads?new=true')}
          style={{ gap: '0.35rem' }}
        >
          <Plus size={14} strokeWidth={2.5} />
          <span className="topbar-add-label">Add Lead</span>
        </button>

        {/* Theme Toggle (Dark / Light) */}
        <button
          onClick={toggleTheme}
          className="btn btn-ghost btn-icon"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          id="theme-toggle-btn"
        >
          {isDark ? (
            <Sun size={18} strokeWidth={1.75} />
          ) : (
            <Moon size={18} strokeWidth={1.75} />
          )}
        </button>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="btn btn-ghost btn-icon"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            style={{ position: 'relative' }}
          >
            <Bell size={18} strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 5, right: 5,
                background: 'var(--color-danger)',
                color: 'white',
                fontSize: '0.55rem', fontWeight: 700,
                width: 14, height: 14,
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <>
              <div
                onClick={() => setShowNotifs(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 99 }}
              />
              <div className="notif-popover" style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                width: 320, maxHeight: 460,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-xl)',
                zIndex: 100,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideUp 120ms ease',
              }}>
                {/* Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.875rem 1.125rem',
                  borderBottom: '1px solid var(--color-border)',
                  flexShrink: 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Bell size={14} strokeWidth={1.75} color="var(--text-secondary)" />
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <span style={{
                        background: 'var(--color-danger)', color: 'white',
                        fontSize: '0.6rem', fontWeight: 700,
                        padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-full)',
                      }}>{unreadCount}</span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem' }}>
                      Mark all read
                    </button>
                  )}
                </div>

                {/* List */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {notifications.length === 0 ? (
                    <div style={{
                      padding: '2rem', textAlign: 'center',
                      color: 'var(--text-muted)', fontSize: '0.825rem',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
                    }}>
                      <CheckCircle size={28} strokeWidth={1.5} color="var(--color-success)" />
                      <span>All caught up</span>
                    </div>
                  ) : (
                    notifications.slice(0, 20).map(notif => {
                      const Icon = NOTIF_ICONS[notif.type] || Bell;
                      const iconColor = NOTIF_COLORS[notif.type] || 'var(--text-muted)';
                      return (
                        <button
                          key={notif.id}
                          onClick={() => handleNotifClick(notif)}
                          style={{
                            width: '100%', textAlign: 'left',
                            padding: '0.75rem 1.125rem',
                            borderBottom: '1px solid var(--color-border-light)',
                            background: !notif.read_status ? 'rgba(232,160,32,0.03)' : 'transparent',
                            cursor: notif.lead_id ? 'pointer' : 'default',
                            border: 'none',
                            transition: 'background 120ms',
                            display: 'flex',
                            gap: '0.625rem',
                            alignItems: 'flex-start',
                          }}
                        >
                          <div style={{
                            width: 28, height: 28,
                            borderRadius: '50%',
                            background: `${iconColor}18`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, marginTop: '0.1rem',
                          }}>
                            <Icon size={13} strokeWidth={2} color={iconColor} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: notif.read_status ? 400 : 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                              {notif.title}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem', lineHeight: 1.4 }}>
                              {notif.content}
                            </div>
                            <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                              {formatRelative(notif.created_at)}
                            </div>
                          </div>
                          {!notif.read_status && (
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-primary)', flexShrink: 0, marginTop: '0.35rem' }} />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          #mobile-menu-btn { display: flex !important; }
          header { left: 0 !important; }
          .topbar-add-label { display: none; }
          .topbar-date-desktop { display: none !important; }
          .topbar-brand-mobile { display: flex !important; }
          .notif-popover {
            width: min(340px, calc(100vw - 20px)) !important;
            right: -6px !important;
          }
        }
      `}</style>
    </header>
  );
}
