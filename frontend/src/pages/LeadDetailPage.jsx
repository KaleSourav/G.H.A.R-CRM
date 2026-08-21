import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Pencil, Plus, Phone, Mail, Tag, Building2,
  Ruler, IndianRupee, AlertTriangle, FileText, MessageSquare, MapPin,
  CheckCircle, Clock,
} from 'lucide-react';
import { leadsAPI, tasksAPI, teamAPI, projectsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PIPELINE_STAGES, ACTIVITY_TYPE_CONFIG, STAGE_CONFIG, PRIORITY_CONFIG, LOST_REASONS } from '../utils/constants';
import { formatDateTime, formatPhone, formatCurrency, formatRelative, getInitials, stageToClass } from '../utils/helpers';
import ActivityTimeline from '../components/leads/ActivityTimeline';
import TaskForm from '../components/tasks/TaskForm';
import LeadForm from '../components/leads/LeadForm';
import LostReasonModal from '../components/pipeline/LostReasonModal';
import toast from 'react-hot-toast';

export default function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, canManageTeam } = useAuth();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState('note');
  const [addingNote, setAddingNote] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [executives, setExecutives] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activeTab, setActiveTab] = useState('activity');

  const loadLead = useCallback(async () => {
    try {
      const { data } = await leadsAPI.get(id);
      setLead(data);
    } catch {
      toast.error('Failed to load lead');
      navigate('/leads');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadLead();
    if (canManageTeam) {
      teamAPI.list().then(r => setExecutives(r.data?.filter(u => u.role === 'executive') || [])).catch(() => {});
    }
    projectsAPI.list().then(r => setProjects(r.data || [])).catch(() => {});
  }, [loadLead, canManageTeam]);

  const handleStageChange = async (newStage) => {
    if (newStage === 'Lost / Dropped') {
      setShowLostModal(true);
      return;
    }
    try {
      await leadsAPI.update(id, { stage: newStage });
      toast.success(`Stage updated to "${newStage}"`);
      loadLead();
    } catch { toast.error('Failed to update stage'); }
  };

  const handleLostConfirm = async (reason) => {
    try {
      await leadsAPI.update(id, { stage: 'Lost / Dropped', lost_reason: reason });
      setShowLostModal(false);
      toast.success('Lead marked as Lost');
      loadLead();
    } catch { toast.error('Failed to update stage'); }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      await leadsAPI.addActivity(id, { type: noteType, content: noteText });
      setNoteText('');
      toast.success('Activity logged');
      loadLead();
    } catch { toast.error('Failed to log activity'); }
    finally { setAddingNote(false); }
  };

  const handleReassign = async (toUserId) => {
    try {
      await leadsAPI.reassign(id, toUserId);
      toast.success('Lead reassigned');
      loadLead();
    } catch { toast.error('Reassign failed'); }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><span className="spinner" style={{ width: 32, height: 32 }} /></div>;
  }

  if (!lead) return null;

  const stageIndex = PIPELINE_STAGES.indexOf(lead.stage);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 1200 }}>
      {/* Back */}
      <button onClick={() => navigate('/leads')} className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}>
        ← Back to Leads
      </button>

      {/* Header Card */}
      <div className="card" style={{ background: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Avatar */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.25rem', fontWeight: 700, color: 'white', flexShrink: 0,
          }}>
            {getInitials(lead.name)}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{lead.name}</h1>
              <span className={`badge ${PRIORITY_CONFIG[lead.priority]?.class}`}>
                {PRIORITY_CONFIG[lead.priority]?.label}
              </span>
              {lead.is_duplicate && <span className="badge badge-danger">Duplicate</span>}
              {lead.sla_breach && <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><AlertTriangle size={10} strokeWidth={2} /> SLA Breach</span>}
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', flexWrap: 'wrap', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Phone size={12} strokeWidth={1.75} />
                <a href={`tel:${lead.phone}`} style={{ color: 'var(--color-info)' }}>{formatPhone(lead.phone)}</a>
              </span>
              {lead.email && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Mail size={12} strokeWidth={1.75} />{lead.email}</span>}
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Tag size={12} strokeWidth={1.75} />{lead.source}{lead.sub_source && ` · ${lead.sub_source}`}</span>
              {lead.project && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Building2 size={12} strokeWidth={1.75} />{lead.project.name}</span>}
              {lead.configuration && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Ruler size={12} strokeWidth={1.75} />{lead.configuration}</span>}
              {lead.budget_max && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><IndianRupee size={12} strokeWidth={1.75} />upto {formatCurrency(lead.budget_max)}</span>}
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Lead Score: <strong style={{ color: 'var(--color-primary)' }}>{lead.lead_score}/100</strong>
              {' · '}Created {formatDateTime(lead.created_at)}
              {' · '}Last active {formatRelative(lead.last_activity_at)}
            </div>
          </div>

          {/* Direct Actions Toolbar */}
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', flexShrink: 0 }}>
            <a
              href={`tel:${lead.phone}`}
              className="btn btn-primary btn-sm"
              style={{ gap: '0.35rem' }}
            >
              <Phone size={13} strokeWidth={2} /> Call
            </a>
            <a
              href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ gap: '0.35rem', color: 'var(--color-success)', borderColor: 'rgba(34,197,94,0.3)' }}
            >
              <MessageSquare size={13} strokeWidth={2} /> WhatsApp
            </a>
            <button onClick={() => setShowTaskForm(true)} className="btn btn-secondary btn-sm" style={{ gap: '0.35rem' }}>
              <Plus size={13} strokeWidth={2.5} /> Task
            </button>
            <button onClick={() => setShowEditForm(true)} className="btn btn-secondary btn-sm" style={{ gap: '0.35rem' }}>
              <Pencil size={13} strokeWidth={1.75} /> Edit
            </button>
          </div>
        </div>

        {/* Stage Pipeline Progress */}
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Pipeline Stage
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
            {PIPELINE_STAGES.map((stage, i) => {
              const isCurrent = stage === lead.stage;
              const isPast = i < stageIndex;
              const stageConf = STAGE_CONFIG[stage];
              return (
                <button
                  key={stage}
                  onClick={() => handleStageChange(stage)}
                  style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: isCurrent ? 700 : 400,
                    border: `1px solid ${isCurrent ? stageConf?.color : 'var(--color-border)'}`,
                    background: isCurrent ? `${stageConf?.color}20` : isPast ? 'var(--color-surface-2)' : 'transparent',
                    color: isCurrent ? stageConf?.color : isPast ? 'var(--text-secondary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {stage}
                </button>
              );
            })}
          </div>
          {lead.stage === 'Lost / Dropped' && lead.lost_reason && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--color-danger)' }}>
              Lost reason: <strong>{lead.lost_reason}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem' }}>
        {/* Left: Activity + Tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Log activity */}
          <div className="card">
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>Log Activity</h3>
            <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[
                  { value: 'note',               label: 'Note' },
                  { value: 'call',               label: 'Call' },
                  { value: 'email',              label: 'Email' },
                  { value: 'whatsapp',           label: 'WhatsApp' },
                  { value: 'site_visit_scheduled', label: 'Site Visit' },
                ].map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setNoteType(t.value)}
                    className={`btn btn-sm ${noteType === t.value ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <textarea
                className="form-textarea"
                placeholder={`Log a ${noteType.replace('_', ' ')}...`}
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                rows={3}
              />
              <button type="submit" className="btn btn-primary btn-sm" disabled={addingNote || !noteText.trim()} style={{ alignSelf: 'flex-end' }}>
                {addingNote ? 'Logging...' : 'Log Activity'}
              </button>
            </form>
          </div>

          {/* Activity Timeline */}
          <div className="card">
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem' }}>Activity Timeline</h3>
            <ActivityTimeline activities={lead.activities || []} />
          </div>
        </div>

        {/* Right: Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Assignment */}
          <div className="card">
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>Assignment</h3>
            {lead.assignee ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.875rem', fontWeight: 700, color: 'white',
                }}>
                  {getInitials(lead.assignee.name)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{lead.assignee.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lead.assignee.email}</div>
                </div>
              </div>
            ) : (
              <span style={{ color: 'var(--color-warning)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AlertTriangle size={14} strokeWidth={1.75} /> Unassigned
              </span>
            )}
            {canManageTeam && executives.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <select
                  className="form-select"
                  onChange={e => e.target.value && handleReassign(e.target.value)}
                  defaultValue=""
                  style={{ fontSize: '0.8rem' }}
                >
                  <option value="">Reassign to...</option>
                  {executives.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.current_lead_count || 0} leads)</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Lead Details */}
          <div className="card">
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>Lead Details</h3>
            {[
              { label: 'Source', value: `${lead.source}${lead.sub_source ? ` • ${lead.sub_source}` : ''}` },
              { label: 'Budget', value: lead.budget_max ? `Up to ${formatCurrency(lead.budget_max)}` : lead.budget_min ? `From ${formatCurrency(lead.budget_min)}` : '—' },
              { label: 'Configuration', value: lead.configuration || '—' },
              { label: 'Location Pref.', value: lead.location_pref || '—' },
              { label: 'Purpose', value: lead.purpose?.replace('_', ' ') || '—' },
              { label: 'Next Follow-up', value: lead.next_followup_at ? formatDateTime(lead.next_followup_at) : '—' },
              { label: 'First Contacted', value: lead.first_contacted_at ? formatDateTime(lead.first_contacted_at) : 'Not yet' },
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '0.5rem 0', borderBottom: '1px solid var(--color-border-light)',
                fontSize: '0.8rem',
              }}>
                <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* Tasks */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Tasks ({lead.tasks?.length || 0})</h3>
              <button onClick={() => setShowTaskForm(true)} className="btn btn-ghost btn-sm">+ Add</button>
            </div>
            {!lead.tasks?.length ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No tasks yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {lead.tasks.slice(0, 5).map(task => (
                  <div key={task.id} style={{
                    padding: '0.5rem 0.75rem',
                    background: 'var(--color-surface-2)',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    border: '1px solid var(--color-border-light)',
                  }}>
                    {task.status === 'completed'
                      ? <CheckCircle size={13} strokeWidth={2} color="var(--color-success)" />
                      : <Clock size={13} strokeWidth={1.75} color="var(--color-warning)" />
                    }
                    <span style={{ flex: 1, textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>{task.title}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{formatDateTime(task.due_date)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unit Interest */}
          {lead.unit_interest && (
            <div className="card">
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>Interested Unit</h3>
              <div style={{ fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 600 }}>{lead.unit_interest.unit_number}</div>
                <div style={{ color: 'var(--text-secondary)' }}>{lead.unit_interest.configuration} • {lead.unit_interest.area_sqft} sqft</div>
                <div style={{ color: 'var(--color-primary)', fontWeight: 600, marginTop: '0.25rem' }}>{formatCurrency(lead.unit_interest.price)}</div>
                <span className={`badge badge-${lead.unit_interest.status}`} style={{ marginTop: '0.5rem' }}>
                  {lead.unit_interest.status}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showTaskForm && (
        <TaskForm
          leadId={id}
          executives={executives}
          canAssign={canManageTeam}
          onClose={() => setShowTaskForm(false)}
          onSave={() => { setShowTaskForm(false); loadLead(); }}
        />
      )}

      {showEditForm && (
        <LeadForm
          lead={lead}
          projects={projects}
          executives={executives}
          canAssign={canManageTeam}
          onClose={() => setShowEditForm(false)}
          onSave={() => { setShowEditForm(false); loadLead(); }}
        />
      )}

      {showLostModal && (
        <LostReasonModal
          onConfirm={handleLostConfirm}
          onCancel={() => setShowLostModal(false)}
        />
      )}
    </div>
  );
}
