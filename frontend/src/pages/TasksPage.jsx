import { useState, useEffect, useCallback } from 'react';
import { tasksAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { TASK_TYPES } from '../utils/constants';
import { formatDateTime, isOverdue } from '../utils/helpers';
import TaskForm from '../components/tasks/TaskForm';
import toast from 'react-hot-toast';

const TASK_GROUPS = {
  overdue: { label: '🔴 Overdue', filter: t => isOverdue(t.due_date) && t.status !== 'completed' },
  today: { label: '📅 Due Today', filter: t => {
    const d = new Date(t.due_date);
    const today = new Date();
    return d.toDateString() === today.toDateString() && t.status !== 'completed';
  }},
  upcoming: { label: '🔔 Upcoming', filter: t => {
    const d = new Date(t.due_date);
    const today = new Date(); today.setHours(0,0,0,0);
    return d > today && t.status !== 'completed';
  }},
  completed: { label: '✅ Completed', filter: t => t.status === 'completed' },
};

export default function TasksPage() {
  const { canManageTeam } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [view, setView] = useState('list');

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await tasksAPI.list({ status: filterType ? undefined : undefined, type: filterType || undefined });
      setTasks(data.tasks || []);
    } catch { toast.error('Failed to load tasks'); }
    finally { setLoading(false); }
  }, [filterType]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleComplete = async (task) => {
    try {
      await tasksAPI.update(task.id, { status: task.status === 'completed' ? 'pending' : 'completed' });
      toast.success(task.status === 'completed' ? 'Task reopened' : 'Task completed ✅');
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

  const taskTypeIcon = (type) => TASK_TYPES.find(t => t.value === type)?.icon || '📋';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">
            {grouped.overdue.length > 0 && <span style={{ color: 'var(--color-danger)' }}>{grouped.overdue.length} overdue • </span>}
            {grouped.today.length} due today
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 'auto', fontSize: '0.8rem' }}>
            <option value="">All Types</option>
            {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <button onClick={() => { setEditTask(null); setShowForm(true); }} className="btn btn-primary btn-sm">+ Add Task</button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <span className="spinner" style={{ width: 28, height: 28 }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {Object.entries(TASK_GROUPS).map(([key, group]) => {
            const groupTasks = grouped[key];
            if (groupTasks.length === 0 && key !== 'today') return null;
            return (
              <div key={key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{group.label}</h2>
                  <span style={{
                    background: key === 'overdue' ? 'var(--color-danger-dim)' : 'var(--color-surface-2)',
                    color: key === 'overdue' ? 'var(--color-danger)' : 'var(--text-muted)',
                    borderRadius: '999px', padding: '0.1rem 0.6rem',
                    fontSize: '0.7rem', fontWeight: 700,
                  }}>{groupTasks.length}</span>
                </div>

                {groupTasks.length === 0 ? (
                  <div style={{ padding: '1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    {key === 'today' ? 'No tasks due today 🎉' : 'No tasks'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {groupTasks.map(task => (
                      <div
                        key={task.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.875rem 1rem',
                          background: 'var(--color-surface)',
                          border: `1px solid ${key === 'overdue' ? 'rgba(239,68,68,0.2)' : 'var(--color-border)'}`,
                          borderRadius: '10px',
                          transition: 'all 150ms',
                        }}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={() => handleComplete(task)}
                          style={{
                            width: 20, height: 20,
                            border: `2px solid ${task.status === 'completed' ? 'var(--color-success)' : 'var(--color-border)'}`,
                            borderRadius: '4px',
                            background: task.status === 'completed' ? 'var(--color-success)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', flexShrink: 0, color: 'white', fontSize: '0.7rem',
                          }}
                        >
                          {task.status === 'completed' ? '✓' : ''}
                        </button>

                        {/* Type icon */}
                        <span style={{ fontSize: '1rem', flexShrink: 0 }}>{taskTypeIcon(task.type)}</span>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '0.875rem', fontWeight: 500,
                            color: task.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)',
                            textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                          }}>
                            {task.title}
                          </div>
                          {task.lead && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                              Lead: {task.lead.name} • {task.lead.stage}
                            </div>
                          )}
                          {task.description && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {task.description}
                            </div>
                          )}
                        </div>

                        {/* Due date */}
                        <div style={{
                          fontSize: '0.75rem',
                          color: key === 'overdue' ? 'var(--color-danger)' : 'var(--text-muted)',
                          fontWeight: key === 'overdue' ? 600 : 400,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}>
                          {formatDateTime(task.due_date)}
                        </div>

                        {/* Priority */}
                        {task.priority === 'urgent' && <span className="badge badge-danger">Urgent</span>}
                        {task.priority === 'high' && <span className="badge badge-warning">High</span>}

                        {/* Assignee */}
                        {task.assignee && (
                          <div title={task.assignee.name} style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.6rem', fontWeight: 700, color: 'white', flexShrink: 0,
                          }}>
                            {task.assignee.name?.[0]}
                          </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                          <button onClick={() => { setEditTask(task); setShowForm(true); }} className="btn btn-ghost btn-sm btn-icon" title="Edit">✏️</button>
                          <button onClick={() => handleDelete(task.id)} className="btn btn-ghost btn-sm btn-icon" title="Delete">🗑️</button>
                        </div>
                      </div>
                    ))}
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
