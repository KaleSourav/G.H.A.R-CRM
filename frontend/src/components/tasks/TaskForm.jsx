import { useState } from 'react';
import { tasksAPI } from '../../services/api';
import { TASK_TYPES } from '../../utils/constants';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TaskForm({ task, leadId, executives, canAssign, onClose, onSave }) {
  const isEdit = !!task;
  const [form, setForm] = useState({
    title: task?.title || '',
    type: task?.type || 'call',
    description: task?.description || '',
    due_date: task?.due_date?.slice(0, 16) || '',
    priority: task?.priority || 'medium',
    user_id: task?.user_id || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.due_date) { toast.error('Title and due date are required'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await tasksAPI.update(task.id, form);
        toast.success('Task updated');
      } else {
        await tasksAPI.create({ ...form, lead_id: leadId });
        toast.success('Task created');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save task');
    } finally { setSaving(false); }
  };

  const f = (field) => ({ value: form[field], onChange: e => setForm(p => ({...p, [field]: e.target.value})) });

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{isEdit ? 'Edit Task' : 'Create Task'}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={18} strokeWidth={1.75} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Type selector */}
            <div className="form-group">
              <label className="form-label">Task Type</label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {TASK_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm(p => ({...p, type: t.value}))}
                    className={`btn btn-sm ${form.type === t.value ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" placeholder="e.g., Call Rajesh to confirm site visit" {...f('title')} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Due Date & Time *</label>
                <input className="form-input" type="datetime-local" {...f('due_date')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" {...f('priority')}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {canAssign && executives?.length > 0 && (
              <div className="form-group">
                <label className="form-label">Assign To</label>
                <select className="form-select" {...f('user_id')}>
                  <option value="">Myself</option>
                  {executives.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <textarea className="form-textarea" placeholder="Additional notes..." {...f('description')} rows={3} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
