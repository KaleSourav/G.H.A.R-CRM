import { ACTIVITY_TYPE_CONFIG } from '../../utils/constants';
import { formatDateTime, getInitials } from '../../utils/helpers';

export default function ActivityTimeline({ activities }) {
  if (!activities?.length) {
    return (
      <div className="empty-state" style={{ padding: '2rem' }}>
        <span style={{ fontSize: '2rem' }}>📝</span>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No activity yet</div>
      </div>
    );
  }

  return (
    <div className="timeline">
      {activities.map((activity, i) => {
        const typeConf = ACTIVITY_TYPE_CONFIG[activity.type] || { icon: '📝', label: activity.type, color: '#94A3B8' };
        const meta = activity.metadata || {};
        return (
          <div key={activity.id} className={`timeline-item type-${activity.type}`}>
            <div style={{
              display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
              position: 'relative',
            }}>
              {/* User avatar */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: activity.user
                  ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
                  : 'var(--color-surface-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.65rem', fontWeight: 700, color: 'white',
                flexShrink: 0, position: 'relative', zIndex: 1,
              }}>
                {activity.user ? getInitials(activity.user.name) : typeConf.icon}
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 600,
                      color: typeConf.color, textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {typeConf.icon} {typeConf.label}
                    </span>
                    {activity.user && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                        by {activity.user.name}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {formatDateTime(activity.created_at)}
                  </span>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.5 }}>
                  {activity.content}
                </p>

                {/* Stage change detail */}
                {activity.type === 'stage_change' && meta.from_stage && (
                  <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--color-danger)' }}>{meta.from_stage}</span>
                    <span>→</span>
                    <span style={{ color: 'var(--color-success)' }}>{meta.to_stage}</span>
                    {meta.lost_reason && <span style={{ color: 'var(--color-danger)' }}>({meta.lost_reason})</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
