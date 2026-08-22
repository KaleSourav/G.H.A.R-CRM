import { useState } from 'react';
import { PIPELINE_STAGES, LEAD_SOURCES, CONFIGURATIONS, PURPOSES, LOST_REASONS } from '../../utils/constants';
import { leadsAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function LeadForm({ lead, projects, executives, canAssign, onClose, onSave }) {
  const isEdit = !!lead;
  const [form, setForm] = useState({
    name: lead?.name || '',
    phone: lead?.phone || '',
    email: lead?.email || '',
    alternate_phone: lead?.alternate_phone || '',
    source: lead?.source || 'Manual Entry',
    sub_source: lead?.sub_source || '',
    project_id: lead?.project_id || '',
    budget_min: lead?.budget_min || '',
    budget_max: lead?.budget_max || '',
    configuration: lead?.configuration || '',
    location_pref: lead?.location_pref || '',
    purpose: lead?.purpose || 'not_specified',
    stage: lead?.stage || 'New / Unassigned',
    assigned_to: lead?.assigned_to || '',
    notes: lead?.notes || '',
    next_followup_at: lead?.next_followup_at?.slice(0, 16) || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        budget_min: form.budget_min ? parseInt(form.budget_min) : null,
        budget_max: form.budget_max ? parseInt(form.budget_max) : null,
        project_id: form.project_id || null,
        assigned_to: form.assigned_to || null,
      };
      if (isEdit) {
        await leadsAPI.update(lead.id, payload);
        toast.success('Lead updated');
      } else {
        await leadsAPI.create(payload);
        toast.success('Lead created');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save lead');
    } finally {
      setSaving(false);
    }
  };

  const f = (field) => ({ value: form[field], onChange: e => setForm(p => ({...p, [field]: e.target.value})) });

  const selectedProject = projects.find(p => p.id === form.project_id) || null;

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{isEdit ? 'Edit Lead' : 'Add New Lead'}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Contact Info */}
              <div style={{ gridColumn: '1/-1', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', paddingBottom: '0.25rem', borderBottom: '1px solid var(--color-border)' }}>Contact Info</div>

              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" placeholder="Rajesh Kumar" {...f('name')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone *</label>
                <input className="form-input" type="tel" placeholder="+91 98765 43210" {...f('phone')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="rajesh@email.com" {...f('email')} />
              </div>
              <div className="form-group">
                <label className="form-label">Alternate Phone</label>
                <input className="form-input" type="tel" placeholder="+91 98765 00000" {...f('alternate_phone')} />
              </div>

              {/* Lead Source */}
              <div style={{ gridColumn: '1/-1', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', paddingTop: '0.5rem', paddingBottom: '0.25rem', borderBottom: '1px solid var(--color-border)' }}>Source</div>

              <div className="form-group">
                <label className="form-label">Lead Source</label>
                <select className="form-select" {...f('source')}>
                  {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Sub-Source / Campaign</label>
                <input className="form-input" placeholder="e.g., Facebook — Emerald Heights" {...f('sub_source')} />
              </div>

              {/* Interest */}
              <div style={{ gridColumn: '1/-1', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', paddingTop: '0.5rem', paddingBottom: '0.25rem', borderBottom: '1px solid var(--color-border)' }}>Property Interest</div>

              {/* Visual Project Picker */}
              <div style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Project Interested In</label>

                {/* Selected project preview */}
                {selectedProject && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', background: 'var(--color-primary-dim)', border: '1.5px solid var(--color-primary)', borderRadius: 'var(--radius-lg)', marginBottom: '0.75rem' }}>
                    {selectedProject.brochure_url && (
                      <img src={selectedProject.brochure_url} alt={selectedProject.name} style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 'var(--radius)', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-primary)' }}>{selectedProject.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{selectedProject.location}</div>
                    </div>
                    <button type="button" onClick={() => setForm(p => ({...p, project_id: ''}))} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}>✕ Clear</button>
                  </div>
                )}

                {/* Project cards grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem', maxHeight: 280, overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {/* None option */}
                  <div
                    onClick={() => setForm(p => ({...p, project_id: ''}))}
                    style={{ border: `1.5px solid ${!form.project_id ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius)', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: !form.project_id ? 'var(--color-primary-dim)' : 'var(--color-surface-2)', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, minHeight: 60 }}
                  >
                    Any / Not Sure
                  </div>

                  {projects.map(p => (
                    <div
                      key={p.id}
                      onClick={() => setForm(prev => ({...prev, project_id: p.id}))}
                      style={{ border: `1.5px solid ${form.project_id === p.id ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius)', overflow: 'hidden', cursor: 'pointer', background: form.project_id === p.id ? 'var(--color-primary-dim)' : 'var(--color-surface-2)', transition: 'all 150ms' }}
                    >
                      {p.brochure_url ? (
                        <img src={p.brochure_url} alt={p.name} style={{ width: '100%', height: 72, objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{ width: '100%', height: 72, background: 'linear-gradient(135deg, #1a1f35, #2d3561)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '1.5rem' }}>🏢</span>
                        </div>
                      )}
                      <div style={{ padding: '0.35rem 0.4rem' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.1rem' }}>{p.location}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Configuration</label>
                <select className="form-select" {...f('configuration')}>
                  <option value="">Not Sure</option>
                  {CONFIGURATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Budget Min (₹)</label>
                <input className="form-input" type="number" placeholder="e.g., 5000000" {...f('budget_min')} />
              </div>
              <div className="form-group">
                <label className="form-label">Budget Max (₹)</label>
                <input className="form-input" type="number" placeholder="e.g., 10000000" {...f('budget_max')} />
              </div>
              <div className="form-group">
                <label className="form-label">Location Preference</label>
                <input className="form-input" placeholder="e.g., Baner, Wakad, Hinjewadi" {...f('location_pref')} />
              </div>
              <div className="form-group">
                <label className="form-label">Purpose</label>
                <select className="form-select" {...f('purpose')}>
                  {PURPOSES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              {/* CRM */}
              <div style={{ gridColumn: '1/-1', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', paddingTop: '0.5rem', paddingBottom: '0.25rem', borderBottom: '1px solid var(--color-border)' }}>CRM</div>

              <div className="form-group">
                <label className="form-label">Stage</label>
                <select className="form-select" {...f('stage')}>
                  {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {canAssign && (
                <div className="form-group">
                  <label className="form-label">Assign To</label>
                  <select className="form-select" {...f('assigned_to')}>
                    <option value="">Auto-assign</option>
                    {executives.map(e => <option key={e.id} value={e.id}>{e.name} ({e.current_lead_count || 0} leads)</option>)}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Next Follow-up</label>
                <input className="form-input" type="datetime-local" {...f('next_followup_at')} />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Notes / Remarks</label>
                <textarea className="form-textarea" placeholder="Additional notes..." {...f('notes')} rows={3} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update Lead' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
