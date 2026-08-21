import { useState } from 'react';
import { projectsAPI } from '../../services/api';
import { CONFIGURATIONS } from '../../utils/constants';
import toast from 'react-hot-toast';

export default function UnitForm({ unit, projectId, onClose, onSave }) {
  const isEdit = !!unit;
  const [form, setForm] = useState({
    unit_number: unit?.unit_number || '',
    configuration: unit?.configuration || '',
    floor: unit?.floor || '',
    area_sqft: unit?.area_sqft || '',
    price: unit?.price || '',
    facing: unit?.facing || '',
    status: unit?.status || 'available',
    remarks: unit?.remarks || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        floor: parseInt(form.floor) || null,
        area_sqft: parseFloat(form.area_sqft) || null,
        price: parseInt(form.price) || null,
      };
      if (isEdit) {
        await projectsAPI.updateUnit(projectId, unit.id, payload);
        toast.success(`Unit ${unit.unit_number} updated`);
      } else {
        await projectsAPI.createUnit(projectId, payload);
        toast.success('Unit added');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save unit');
    } finally { setSaving(false); }
  };

  const f = (field) => ({ value: form[field], onChange: e => setForm(p => ({...p, [field]: e.target.value})) });

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            {isEdit ? `Edit Unit ${unit.unit_number}` : 'Add Unit'}
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Unit Number *</label>
                <input className="form-input" placeholder="e.g., A-101" {...f('unit_number')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Configuration *</label>
                <select className="form-select" {...f('configuration')} required>
                  <option value="">Select...</option>
                  {CONFIGURATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Floor</label>
                <input className="form-input" type="number" placeholder="e.g., 5" {...f('floor')} />
              </div>
              <div className="form-group">
                <label className="form-label">Area (sqft)</label>
                <input className="form-input" type="number" step="0.01" placeholder="e.g., 1250" {...f('area_sqft')} />
              </div>
              <div className="form-group">
                <label className="form-label">Price (₹)</label>
                <input className="form-input" type="number" placeholder="e.g., 8500000" {...f('price')} />
              </div>
              <div className="form-group">
                <label className="form-label">Facing</label>
                <select className="form-select" {...f('facing')}>
                  <option value="">Not specified</option>
                  <option value="East">East</option>
                  <option value="West">West</option>
                  <option value="North">North</option>
                  <option value="South">South</option>
                  <option value="North-East">North-East</option>
                  <option value="North-West">North-West</option>
                  <option value="South-East">South-East</option>
                  <option value="South-West">South-West</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Status</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['available', 'held', 'booked', 'sold'].map(s => (
                    <button
                      key={s} type="button"
                      onClick={() => setForm(p => ({...p, status: s}))}
                      className={`btn btn-sm ${form.status === s ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, justifyContent: 'center', textTransform: 'capitalize' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Remarks</label>
                <textarea className="form-textarea" rows={2} placeholder="Any special notes..." {...f('remarks')} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update Unit' : 'Add Unit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
