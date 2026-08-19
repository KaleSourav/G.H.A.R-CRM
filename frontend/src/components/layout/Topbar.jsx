import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { formatRelative } from '../../utils/helpers';

export default function Topbar({ onMenuClick }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    // Poll every 60s
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

  const getNotifIcon = (type) => {
    const icons = {
      lead_assigned: '👤', sla_breach: '⚠️', task_due: '⏰',
      task_overdue: '🔴', lead_stage_changed: '🔄', csv_import_complete: '📥',
      system: 'ℹ️',
    };
    return icons[type] || '🔔';
  };

  return (
    <header style={{
      position: 'fixed',
      top: 0, right: 0,
      left: 'var(--sidebar-width)',
      height: 'var(--topbar-height)',
      background: 'rgba(15,23,42,0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 1.5rem',
      gap: '1rem',
      zIndex: 100,
      transition: 'left 250ms ease',
    }}>
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="btn btn-ghost btn-icon"
        style={{ display: 'none' }}
        id="mobile-menu-btn"
      >
        ☰
      </button>

      {/* Breadcrumb / Title area */}
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          letterSpacing: '0.05em',
        }}>
          G.H.A.R CRM • {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Quick add lead */}
        <button
          className="btn btn-primary btn-sm"
          onClick={() => navigate('/leads?new=true')}
          style={{ gap: '0.4rem' }}
        >
          <span>+</span>
          <span style={{ display: window.innerWidth < 500 ? 'none' : undefined }}>Add Lead</span>
        </button>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="btn btn-ghost btn-icon"
            style={{ position: 'relative', fontSize: '1.1rem' }}
          >
            🔔
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2,
                background: '#EF4444',
                color: 'white',
                fontSize: '0.6rem', fontWeight: 700,
                width: 16, height: 16,
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
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
                width: 340, maxHeight: 480,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-xl)',
                zIndex: 100,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideUp 150ms ease',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  borderBottom: '1px solid var(--color-border)',
                }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>
                      Mark all read
                    </button>
                  )}
                </div>

                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      🎉 All caught up!
                    </div>
                  ) : (
                    notifications.slice(0, 20).map(notif => (
                      <button
                        key={notif.id}
                        onClick={() => handleNotifClick(notif)}
                        style={{
                          width: '100%', textAlign: 'left',
                          padding: '0.875rem 1.25rem',
                          borderBottom: '1px solid var(--color-border-light)',
                          background: !notif.read_status ? 'rgba(245,158,11,0.04)' : 'transparent',
                          cursor: notif.lead_id ? 'pointer' : 'default',
                          border: 'none',
                          transition: 'background 150ms',
                          display: 'flex',
                          gap: '0.75rem',
                          alignItems: 'flex-start',
                        }}
                      >
                        <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: '0.1rem' }}>
                          {getNotifIcon(notif.type)}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: notif.read_status ? 400 : 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                            {notif.title}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.4 }}>
                            {notif.content}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                            {formatRelative(notif.created_at)}
                          </div>
                        </div>
                        {!notif.read_status && (
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', flexShrink: 0, marginTop: '0.3rem' }} />
                        )}
                      </button>
                    ))
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
        }
      `}</style>
    </header>
  );
}
