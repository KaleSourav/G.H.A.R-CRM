import { useState, useEffect, useCallback } from 'react';
import { tasksAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { TASK_TYPES } from '../utils/constants';
import { formatDateTime, isOverdue } from '../utils/helpers';
import {
  Plus, Check, Pencil, Trash2, Clock,
  Phone, Bell, Building2, FileText, Mail, MessageSquare, MoreHorizontal,
  AlertCircle, Calendar, CheckCircle2,
} from 'lucide-react';
import TaskForm from '../components/tasks/TaskForm';
import toast from 'react-hot-toast';

const TASK_GROUP_META = {
  overdue:   { label: 'Overdue',    color: 'var(--color-danger)',  Icon: AlertCircle },
  today:     { label: 'Due Today',  color: 'var(--color-primary)', Icon: Calendar },
  upcoming:  { label: 'Upcoming',   color: 'var(--color-info)',    Icon: Clock },
  completed: { label: 'Completed',  color: 'var(--color-success)', Icon: CheckCircle2 },
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
      toast.success(task.status === 'completed' ? 'Task reopened' : 'Task completed');
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">
            {grouped.overdue.length > 0 && (
              <span style={{ color: 'var(--color-danger)' }}>{grouped.overdue.length} overdue · </span>
            )}
            {grouped.today.length} due today
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            className="form-select"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{ width: 'auto', fontSize: '0.8rem', minHeight: 36 }}
          >
            <option value="">All Types</option>
            {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <button onClick={() => { setEditTask(null); setShowForm(true); }} className="btn btn-primary btn-sm">
            <Plus size={13} strokeWidth={2.5} /> Add Task
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <span className="spinner" style={{ width: 28, height: 28 }} />
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
                  <GroupIcon size={14} strokeWidth={1.75} color={meta.color} />
                  <h2 style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {meta.label}
                  </h2>
                  <span style={{
                    background: key === 'overdue' ? 'var(--color-danger-dim)' : 'var(--color-surface-2)',
                    color: key === 'overdue' ? 'var(--color-danger)' : 'var(--text-muted)',
                    borderRadius: 'var(--radius-full)', padding: '0.1rem 0.55rem',
                    fontSize: '0.68rem', fontWeight: 700,
                    border: key === 'overdue' ? '1px solid rgba(239,68,68,0.25)' : '1px solid var(--color-border)',
                  }}>{groupTasks.length}</span>
                </div>

                {groupTasks.length === 0 ? (
                  <div style={{
                    padding: '0.875rem 1rem',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    fontSize: '0.8rem', color: 'var(--text-muted)',
                    textAlign: 'center',
                  }}>
                    No tasks due today
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {groupTasks.map(task => {
                      const TypeIcon = TYPE_ICONS[task.type] || MoreHorizontal;
                      return (
                        <div
                          key={task.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.625rem',
                            padding: '0.75rem 0.875rem',
                            background: 'var(--color-surface)',
                            border: `1px solid ${key === 'overdue' ? 'rgba(239,68,68,0.15)' : 'var(--color-border)'}`,
                            borderRadius: 'var(--radius-lg)',
                            transition: 'box-shadow 120ms',
                          }}
                        >
                          {/* Complete checkbox */}
                          <button
                            onClick={() => handleComplete(task)}
                            style={{
                              width: 20, height: 20, flexShrink: 0,
                              border: `2px solid ${task.status === 'completed' ? 'var(--color-success)' : 'var(--color-border)'}`,
                              borderRadius: '5px',
                              background: task.status === 'completed' ? 'var(--color-success)' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', color: 'white', transition: 'all 120ms',
                            }}
                          >
                            {task.status === 'completed' && <Check size={11} strokeWidth={2.5} />}
                          </button>

                          {/* Type icon */}
                          <div style={{
                            width: 28, height: 28, flexShrink: 0,
                            background: 'var(--color-surface-2)',
                            borderRadius: 'var(--radius)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <TypeIcon size={13} strokeWidth={1.75} color="var(--text-muted)" />
                          </div>

                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: '0.875rem', fontWeight: 500,
                              color: task.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)',
                              textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {task.title}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                              {task.lead && <span>{task.lead.name} · </span>}
                              {formatDateTime(task.due_date)}
                            </div>
                          </div>

                          {/* Priority */}
                          {task.priority === 'urgent' && <span className="badge badge-danger">Urgent</span>}
                          {task.priority === 'high' && <span className="badge badge-warm">High</span>}

                          {/* Assignee avatar */}
                          {task.assignee && (
                            <div title={task.assignee.name} style={{
                              width: 22, height: 22, borderRadius: '50%',
                              background: 'linear-gradient(135deg, #4F6FE8, #7C3AED)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.58rem', fontWeight: 700, color: 'white', flexShrink: 0,
                            }}>
                              {task.assignee.name?.[0]}
                            </div>
                          )}

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: '0.2rem', flexShrink: 0 }}>
                            <button onClick={() => { setEditTask(task); setShowForm(true); }} className="btn btn-ghost btn-sm btn-icon" title="Edit">
                              <Pencil size={13} strokeWidth={1.75} />
                            </button>
                            <button onClick={() => handleDelete(task.id)} className="btn btn-ghost btn-sm btn-icon" title="Delete"
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
