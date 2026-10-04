import {
  FileText, Phone, Mail, MessageSquare, RotateCcw, UserCheck,
  CheckSquare, MapPin, CheckCircle, Upload, TrendingUp, Download,
} from 'lucide-react';
import { ACTIVITY_TYPE_CONFIG } from '../../utils/constants';
import { formatDateTime, getInitials } from '../../utils/helpers';

const ICON_MAP = {
  FileText, Phone, Mail, MessageSquare, RotateCcw, UserCheck,
  CheckSquare, MapPin, CheckCircle, Upload, TrendingUp, Download,
};

export default function ActivityTimeline({ activities }) {
  if (!activities?.length) {
    return (
      <div className="empty-state" style={{ padding: '2rem' }}>
        <div className="empty-state-icon"><FileText size={20} strokeWidth={1.5} /></div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No activity yet</div>
      </div>
    );
  }

  return (
    <div className="timeline">
      {activities.map((activity) => {
        const typeConf = ACTIVITY_TYPE_CONFIG[activity.type] || { iconName: 'FileText', label: activity.type, color: '#94A3B8' };
        const Icon = ICON_MAP[typeConf.iconName] || FileText;
        const meta = activity.metadata || {};
        return (
          <div key={activity.id} className={`timeline-item type-${activity.type}`}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              {/* User avatar */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: activity.user
                  ? 'linear-gradient(135deg, #4F6FE8, #7C3AED)'
                  : 'var(--color-surface-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.65rem', fontWeight: 700, color: 'white',
                flexShrink: 0, position: 'relative', zIndex: 1,
              }}>
                {activity.user
                  ? getInitials(activity.user.name)
                  : <Icon size={12} strokeWidth={2} />
                }
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingBottom: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Icon size={11} strokeWidth={2} color={typeConf.color} />
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 600,
                      color: typeConf.color, textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {typeConf.label}
                    </span>
                    {activity.user && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        by {activity.user.name}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {formatDateTime(activity.created_at)}
                  </span>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.5 }}>
                  {activity.content}
                </p>

                {/* Stage change detail */}
                {activity.type === 'stage_change' && meta.from_stage && (
                  <div style={{ marginTop: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--color-danger)' }}>{meta.from_stage}</span>
                    <RotateCcw size={10} strokeWidth={2} />
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
