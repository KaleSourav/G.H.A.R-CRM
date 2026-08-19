import { useState, useEffect, useCallback } from 'react';
import { teamAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/constants';
import { formatDate, getInitials } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function TeamPage() {
  const { isAdmin, user } = useAuth();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'executive', manager_id: '', password: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await teamAPI.list();
      setTeam(data || []);
    } catch { toast.error('Failed to load team'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await teamAPI.create(form);
      toast.success(`${form.name} added to team`);
      setShowForm(false);
      setForm({ name: '', email: '', phone: '', role: 'executive', manager_id: '', password: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create user');
    } finally { setSaving(false); }
  };

  const handleDeactivate = async (id, name) => {
    if (!confirm(`Deactivate ${name}?`)) return;
    try {
      await teamAPI.delete(id);
      toast.success(`${name} deactivated`);
      load();
    } catch { toast.error('Failed to deactivate user'); }
  };

  const managers = team.filter(u => u.role === 'manager');
  const byRole = team.reduce((acc, u) => { (acc[u.role] = acc[u.role] || []).push(u); return acc; }, {});

  const roleOrder = ['admin', 'manager', 'executive', 'front_office', 'finance'];
  const roleLabels = { admin: 'Admin', manager: 'Sales Managers', executive: 'Sales Executives', front_office: 'Front Office', finance: 'Finance' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Team</h1>
          <p className="page-subtitle">{team.length} team members</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm">+ Add User</button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><span className="spinner" style={{ width: 28, height: 28 }} /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {roleOrder.filter(role => byRole[role]?.length).map(role => (
            <div key={role}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
                {roleLabels[role] || role}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                {byRole[role].map(member => (
                  <div key={member.id} className="card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: `linear-gradient(135deg, ${roleColor(role)})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.9rem', fontWeight: 700, color: 'white', flexShrink: 0,
                      }}>
                        {getInitials(member.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {member.name}
                          {member.id === user?.id && <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', color: 'var(--color-primary)' }}>(You)</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.email}</div>
                        {member.phone && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{member.phone}</div>}
                      </div>
                      <span className={`badge ${member.status === 'active' ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: '0.6rem', flexShrink: 0 }}>
                        {member.status}
                      </span>
                    </div>

                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {member.current_lead_count || 0} active leads
                        {member.manager && <span> · Reports to {member.manager.name}</span>}
                      </div>
                      {isAdmin && member.id !== user?.id && member.status === 'active' && (
                        <button
                          onClick={() => handleDeactivate(member.id, member.name)}
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: '0.7rem', color: 'var(--color-danger)' }}
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add User Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Add Team Member</h2>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-icon">✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required placeholder="Priya Sharma" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required placeholder="priya@ghar.in" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="+91 98765 43210" />
                </div>
                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select className="form-select" value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}>
                    {ROLES.filter(r => r.value !== 'channel_partner').map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                {form.role === 'executive' && managers.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Reports To (Manager)</label>
                    <select className="form-select" value={form.manager_id} onChange={e => setForm(f => ({...f, manager_id: e.target.value}))}>
                      <option value="">Select Manager</option>
                      {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Temporary Password *</label>
                  <input className="form-input" type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} required minLength={8} placeholder="Min. 8 characters" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function roleColor(role) {
  const colors = {
    admin: '#F59E0B, #D97706',
    manager: '#6366F1, #8B5CF6',
    executive: '#10B981, #059669',
    front_office: '#3B82F6, #2563EB',
    finance: '#EC4899, #DB2777',
  };
  return colors[role] || '#64748B, #475569';
}
