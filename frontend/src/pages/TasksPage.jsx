import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { TASK_TYPES } from '../utils/constants';
import { formatDateTime, isOverdue, formatRelative } from '../utils/helpers';
import {
  Plus, Check, Pencil, Trash2, Clock,
  Phone, Bell, Building2, FileText, Mail, MessageSquare, MoreHorizontal,
  AlertCircle, Calendar, CheckCircle2, CheckCircle, ExternalLink,
} from 'lucide-react';
import TaskForm from '../components/tasks/TaskForm';
import toast from 'react-hot-toast';

const TASK_GROUP_META = {
  overdue:   { label: 'Overdue Action Items', color: 'var(--color-danger)',  Icon: AlertCircle, bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)' },
  today:     { label: 'Due Today',            color: 'var(--color-primary)', Icon: Calendar,    bg: 'rgba(232,160,32,0.06)', border: 'rgba(232,160,32,0.2)' },
  upcoming:  { label: 'Upcoming Follow-ups',  color: 'var(--color-info)',    Icon: Clock,       bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.2)' },
  completed: { label: 'Completed History',    color: 'var(--color-success)', Icon: CheckCircle2,bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.2)' },
};

const TASK_GROUPS = {
  overdue:   { filter: t => isOverdue(t.due_date) && t.status !== 'completed' },
  today:     { filter: t => {
    const d = new Date(t.due_date);
    const today = new Date();
    return d.toDateString() === today.toDateString() && t.status !== 'completed';
  }},
  upcoming:  { filter: t => {
    const d = new Date(t.due_date);
    const today = new Date(); today.setHours(0,0,0,0);
    return d > today && t.status !== 'completed';
  }},
  completed: { filter: t => t.status === 'completed' },
};

const TYPE_ICONS = {
  call: Phone, follow_up: Bell, site_visit: Building2,
  document: FileText, email: Mail, whatsapp: MessageSquare, other: MoreHorizontal,
};

export default function TasksPage() {
  const { canManageTeam } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [filterType, setFilterType] = useState('');

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await tasksAPI.list({ type: filterType || undefined });
      setTasks(data.tasks || []);
    } catch { toast.error('Failed to load tasks'); }
    finally { setLoading(false); }
  }, [filterType]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleComplete = async (task) => {
    try {
      await tasksAPI.update(task.id, { status: task.status === 'completed' ? 'pending' : 'completed' });
      toast.success(task.status === 'completed' ? 'Task marked pending' : 'Task marked complete');
      loadTasks();
    } catch { toast.error('Failed to update task'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this task?')) return;
    try {
      await tasksAPI.delete(id);
      toast.success('Task deleted');
      loadTasks();
    } catch { toast.error('Failed to delete task'); }
  };

  const grouped = Object.entries(TASK_GROUPS).reduce((acc, [key, group]) => {
    acc[key] = tasks.filter(group.filter);
    return acc;
  }, {});

  const totalCount = tasks.length;
  const completedCount = grouped.completed.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span className="live-pulse-dot" />
            <h1 className="page-title">Tasks & Follow-up Center</h1>
          </div>
          <p className="page-subtitle">Schedule client meetings, calls, site visits, and SLA action items</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            className="form-select"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{ width: 'auto', fontSize: '0.8rem', minHeight: 36 }}
          >
            <option value="">All Categories</option>
            {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <button onClick={() => { setEditTask(null); setShowForm(true); }} className="btn btn-primary btn-sm">
            <Plus size={14} strokeWidth={2.5} /> Create Task
          </button>
        </div>
      </div>

      {/* ── Daily Task Progress Banner ──────────────────────────────────── */}
      <div className="card" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="icon-box icon-box-sm" style={{ background: 'var(--color-primary-dim)', color: 'var(--color-primary)' }}>
              <CheckCircle size={15} strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Daily Task Velocity
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {completedCount} of {totalCount} total tasks completed ({completionPercentage}%)
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.625rem', fontSize: '0.72rem' }}>
            {grouped.overdue.length > 0 && (
              <span style={{ color: 'var(--color-danger)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <AlertCircle size={12} strokeWidth={2} /> {grouped.overdue.length} Overdue
              </span>
            )}
            <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
              {grouped.today.length} Due Today
            </span>
            <span style={{ color: 'var(--color-info)', fontWeight: 600 }}>
              {grouped.upcoming.length} Upcoming
            </span>
          </div>
        </div>

        <div style={{ height: 6, background: 'var(--color-surface-3)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${completionPercentage}%`,
            background: 'linear-gradient(90deg, #E8A020, #22C55E)',
            borderRadius: '3px', transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* ── Grouped Task Columns / Rows ─────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <span className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {Object.entries(TASK_GROUPS).map(([key, group]) => {
            const groupTasks = grouped[key];
            const meta = TASK_GROUP_META[key];
            const GroupIcon = meta.Icon;
            if (groupTasks.length === 0 && key !== 'today') return null;
            return (
              <div key={key}>
                {/* Group header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <GroupIcon size={14} strokeWidth={2} color={meta.color} />
                  <h2 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {meta.label}
                  </h2>
                  <span style={{
                    background: key === 'overdue' ? 'var(--color-danger-dim)' : 'var(--color-surface-2)',
                    color: key === 'overdue' ? 'var(--color-danger)' : 'var(--text-muted)',
                    borderRadius: 'var(--radius-full)', padding: '0.1rem 0.5rem',
                    fontSize: '0.68rem', fontWeight: 700,
                    border: `1px solid ${meta.border}`,
                  }}>{groupTasks.length}</span>
                </div>

                {groupTasks.length === 0 ? (
                  <div style={{
                    padding: '1rem',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    fontSize: '0.82rem', color: 'var(--text-muted)',
                    textAlign: 'center',
                  }}>
                    No tasks scheduled for today — all caught up!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {groupTasks.map(task => {
                      const TypeIcon = TYPE_ICONS[task.type] || MoreHorizontal;
                      return (
                        <div
                          key={task.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            background: task.status === 'completed' ? 'var(--color-surface-2)' : 'var(--color-surface)',
                            border: `1px solid ${key === 'overdue' ? 'rgba(239,68,68,0.2)' : 'var(--color-border)'}`,
                            borderRadius: 'var(--radius-lg)',
                            transition: 'all 120ms',
                            opacity: task.status === 'completed' ? 0.7 : 1,
                          }}
                        >
                          {/* Complete checkbox */}
                          <button
                            onClick={() => handleComplete(task)}
                            style={{
                              width: 22, height: 22, flexShrink: 0,
                              border: `2px solid ${task.status === 'completed' ? 'var(--color-success)' : 'var(--color-border)'}`,
                              borderRadius: '6px',
                              background: task.status === 'completed' ? 'var(--color-success)' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', color: 'white', transition: 'all 120ms',
                            }}
                          >
                            {task.status === 'completed' && <Check size={13} strokeWidth={3} />}
                          </button>

                          {/* Type icon */}
                          <div style={{
                            width: 32, height: 32, flexShrink: 0,
                            background: 'var(--color-surface-2)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <TypeIcon size={14} strokeWidth={1.75} color="var(--color-primary)" />
                          </div>

                          {/* Task Content & Linked Lead */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: '0.875rem', fontWeight: 600,
                              color: task.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)',
                              textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {task.title}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {task.lead && (
                                <button
                                  onClick={() => navigate(`/leads/${task.lead_id}`)}
                                  style={{
                                    color: 'var(--color-info)', fontWeight: 600, background: 'none',
                                    border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '2px',
                                  }}
                                >
                                  {task.lead.name} <ExternalLink size={10} strokeWidth={2} />
                                </button>
                              )}
                              <span>Due {formatDateTime(task.due_date)}</span>
                            </div>
                          </div>

                          {/* Priority badge */}
                          {task.priority === 'urgent' && <span className="badge badge-danger">Urgent</span>}
                          {task.priority === 'high' && <span className="badge badge-warm">High</span>}

                          {/* Assignee Avatar */}
                          {task.assignee && (
                            <div title={`Assigned: ${task.assignee.name}`} style={{
                              width: 24, height: 24, borderRadius: '50%',
                              background: 'linear-gradient(135deg, #4F6FE8, #7C3AED)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.62rem', fontWeight: 700, color: 'white', flexShrink: 0,
                            }}>
                              {task.assignee.name?.[0]}
                            </div>
                          )}

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                            <button onClick={() => { setEditTask(task); setShowForm(true); }} className="btn btn-ghost btn-sm btn-icon" title="Edit">
                              <Pencil size={13} strokeWidth={1.75} />
                            </button>
                            <button
                              onClick={() => handleDelete(task.id)}
                              className="btn btn-ghost btn-sm btn-icon"
                              title="Delete"
                              style={{ color: 'var(--text-muted)' }}
                              onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
                              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                              <Trash2 size={13} strokeWidth={1.75} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <TaskForm
          task={editTask}
          canAssign={canManageTeam}
          onClose={() => { setShowForm(false); setEditTask(null); }}
          onSave={() => { setShowForm(false); setEditTask(null); loadTasks(); }}
        />
      )}
    </div>
  );
}
