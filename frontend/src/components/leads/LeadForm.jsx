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

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{isEdit ? 'Edit Lead' : 'Add New Lead'}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon">✕</button>
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

              <div className="form-group">
                <label className="form-label">Project Interested In</label>
                <select className="form-select" {...f('project_id')}>
                  <option value="">Any / Not Sure</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
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
