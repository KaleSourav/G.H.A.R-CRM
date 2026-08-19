import { useState } from 'react';
import { projectsAPI } from '../../services/api';
import { CONFIGURATIONS } from '../../utils/constants';
import toast from 'react-hot-toast';

export default function ProjectForm({ project, onClose, onSave }) {
  const isEdit = !!project;
  const [form, setForm] = useState({
    name: project?.name || '',
    developer_name: project?.developer_name || '',
    location: project?.location || '',
    address: project?.address || '',
    rera_number: project?.rera_number || '',
    total_units: project?.total_units || '',
    price_min: project?.price_min || '',
    price_max: project?.price_max || '',
    launch_date: project?.launch_date || '',
    possession_date: project?.possession_date || '',
    configurations: project?.configurations || [],
    amenities: project?.amenities?.join(', ') || '',
    status: project?.status || 'upcoming',
    description: project?.description || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        total_units: parseInt(form.total_units) || 0,
        price_min: parseInt(form.price_min) || null,
        price_max: parseInt(form.price_max) || null,
        amenities: form.amenities ? form.amenities.split(',').map(a => a.trim()).filter(Boolean) : [],
      };
      if (isEdit) {
        await projectsAPI.update(project.id, payload);
        toast.success('Project updated');
      } else {
        await projectsAPI.create(payload);
        toast.success('Project created');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save project');
    } finally { setSaving(false); }
  };

  const f = (field) => ({ value: form[field], onChange: e => setForm(p => ({...p, [field]: e.target.value})) });

  const toggleConfig = (c) => setForm(p => ({
    ...p,
    configurations: p.configurations.includes(c)
      ? p.configurations.filter(x => x !== c)
      : [...p.configurations, c],
  }));

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{isEdit ? 'Edit Project' : 'Add Project'}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Project Name *</label>
                <input className="form-input" placeholder="e.g., Emerald Heights" {...f('name')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Developer</label>
                <input className="form-input" placeholder="e.g., Lodha Group" {...f('developer_name')} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" {...f('status')}>
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="sold_out">Sold Out</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Location *</label>
                <input className="form-input" placeholder="e.g., Baner, Pune" {...f('location')} required />
              </div>
              <div className="form-group">
                <label className="form-label">RERA Number</label>
                <input className="form-input" placeholder="P52100XXXXX" {...f('rera_number')} />
              </div>
              <div className="form-group">
                <label className="form-label">Total Units</label>
                <input className="form-input" type="number" placeholder="e.g., 240" {...f('total_units')} />
              </div>
              <div className="form-group">
                <label className="form-label">Min Price (₹)</label>
                <input className="form-input" type="number" placeholder="e.g., 5000000" {...f('price_min')} />
              </div>
              <div className="form-group">
                <label className="form-label">Max Price (₹)</label>
                <input className="form-input" type="number" placeholder="e.g., 12000000" {...f('price_max')} />
              </div>
              <div className="form-group">
                <label className="form-label">Launch Date</label>
                <input className="form-input" type="date" {...f('launch_date')} />
              </div>
              <div className="form-group">
                <label className="form-label">Possession Date</label>
                <input className="form-input" type="date" {...f('possession_date')} />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Configurations Available</label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {CONFIGURATIONS.map(c => (
                    <button
                      key={c} type="button"
                      onClick={() => toggleConfig(c)}
                      className={`btn btn-sm ${form.configurations.includes(c) ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Amenities (comma-separated)</label>
                <input className="form-input" placeholder="Swimming Pool, Gym, Clubhouse, Security" {...f('amenities')} />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Description</label>
                <textarea className="form-textarea" rows={3} placeholder="Project description..." {...f('description')} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
