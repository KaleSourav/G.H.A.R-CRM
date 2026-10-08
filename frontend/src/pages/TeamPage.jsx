import { useState, useEffect, useCallback } from 'react';
import { teamAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/constants';
import { formatDate, getInitials } from '../utils/helpers';
import { Plus, X, Shield, ShieldCheck, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TeamPage() {
  const { isSuperAdmin, canCreateUsers, user } = useAuth();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'executive', manager_id: '', password: '' });
  const [saving, setSaving] = useState(false);

  // Edit user state
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', role: '', manager_id: '', status: '' });
  const [editingSaving, setEditingSaving] = useState(false);

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
    if (!canCreateUsers) {
      toast.error('Only Admins and Super Admins can create new users');
      return;
    }
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

  const handleToggleStatus = async (id, name, newStatus) => {
    if (!canCreateUsers) {
      toast.error('Only Admins and Super Admins can manage user status');
      return;
    }
    const actionLabel = newStatus === 'active' ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${actionLabel} ${name}?`)) return;
    try {
      await teamAPI.update(id, { status: newStatus });
      toast.success(`${name} ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to ${actionLabel} user`);
    }
  };

  const openEditModal = (member) => {
    setEditUser(member);
    setEditForm({
      name: member.name || '',
      phone: member.phone || '',
      role: member.role || 'executive',
      manager_id: member.manager_id || '',
      status: member.status || 'active',
    });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!canCreateUsers) return;
    setEditingSaving(true);
    try {
      await teamAPI.update(editUser.id, editForm);
      toast.success(`${editForm.name} updated successfully`);
      setEditUser(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update user');
    } finally {
      setEditingSaving(false);
    }
  };

  const managers = team.filter(u => u.role === 'manager');

  // Identify founders and super admins, and group by display role
  const byRole = team.reduce((acc, u) => {
    let displayRole = u.role;
    if (
      u.role === 'super_admin' ||
      u.role === 'superadmin' ||
      u.is_super_admin ||
      ['admin@ghar.in', 'sourav@ghar.in'].includes(u.email?.toLowerCase())
    ) {
      displayRole = 'super_admin';
    }
    (acc[displayRole] = acc[displayRole] || []).push(u);
    return acc;
  }, {});

  const roleOrder = ['super_admin', 'admin', 'manager', 'executive', 'front_office', 'finance'];
  const roleLabels = {
    super_admin: 'Super Admins (Founders)',
    admin: 'Admins',
    manager: 'Sales Managers',
    executive: 'Sales Executives',
    front_office: 'Front Office',
    finance: 'Finance',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Team Directory</h1>
          <p className="page-subtitle">{team.length} team members</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {!canCreateUsers && (
            <span style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius)',
            }}>
              Directory View · User creation & roles are managed by Admins and Founders
            </span>
          )}

          {canCreateUsers && (
            <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm">
              <Plus size={13} strokeWidth={2.5} /> Add User
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><span className="spinner" style={{ width: 28, height: 28 }} /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {roleOrder.filter(role => byRole[role]?.length).map(role => (
            <div key={role}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {role === 'super_admin' && <ShieldCheck size={16} color="var(--color-primary)" />}
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
                      {canCreateUsers && member.id !== user?.id && (
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            onClick={() => openEditModal(member)}
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '0.7rem' }}
                            title="Edit User"
                          >
                            Edit
                          </button>
                          {member.status === 'active' ? (
                            <button
                              onClick={() => handleToggleStatus(member.id, member.name, 'inactive')}
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '0.7rem', color: 'var(--color-danger)' }}
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(member.id, member.name, 'active')}
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '0.7rem', color: 'var(--color-success)' }}
                            >
                              Activate
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add User Modal — Admin & Super Admin */}
      {showForm && canCreateUsers && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-sheet-handle" />
            <div className="modal-header">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Add Team Member</h2>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-icon"><X size={18} strokeWidth={1.75} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body form-grid-2">
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
                    <option value="super_admin">Super Admin (Founder — Full Access & XL Download)</option>
                    <option value="admin">Admin (CRM Operations & User Creation — No XL Download)</option>
                    <option value="manager">Sales Manager</option>
                    <option value="executive">Sales Executive</option>
                    <option value="front_office">Front Office</option>
                    <option value="finance">Finance</option>
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

      {/* Edit User Modal — Admin & Super Admin */}
      {editUser && canCreateUsers && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-sheet-handle" />
            <div className="modal-header">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Edit Team Member</h2>
              <button onClick={() => setEditUser(null)} className="btn btn-ghost btn-icon"><X size={18} strokeWidth={1.75} /></button>
            </div>
            <form onSubmit={handleUpdateUser}>
              <div className="modal-body form-grid-2">
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Full Name *</label>
                  <input
                    className="form-input"
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({...f, name: e.target.value}))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email (Read-only)</label>
                  <input className="form-input" value={editUser.email} disabled style={{ opacity: 0.7 }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    className="form-input"
                    value={editForm.phone}
                    onChange={e => setEditForm(f => ({...f, phone: e.target.value}))}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select
                    className="form-select"
                    value={editForm.role}
                    onChange={e => setEditForm(f => ({...f, role: e.target.value}))}
                  >
                    <option value="super_admin">Super Admin (Founder — Full Access & XL Download)</option>
                    <option value="admin">Admin (CRM Operations & User Creation — No XL Download)</option>
                    <option value="manager">Sales Manager</option>
                    <option value="executive">Sales Executive</option>
                    <option value="front_office">Front Office</option>
                    <option value="finance">Finance</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Account Status</label>
                  <select
                    className="form-select"
                    value={editForm.status}
                    onChange={e => setEditForm(f => ({...f, status: e.target.value}))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                {editForm.role === 'executive' && managers.length > 0 && (
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Reports To (Manager)</label>
                    <select
                      className="form-select"
                      value={editForm.manager_id}
                      onChange={e => setEditForm(f => ({...f, manager_id: e.target.value}))}
                    >
                      <option value="">Select Manager</option>
                      {managers.filter(m => m.id !== editUser.id).map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setEditUser(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={editingSaving}>
                  {editingSaving ? 'Saving...' : 'Save Changes'}
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
    super_admin: '#E8A020, #B45309',
    admin: '#F59E0B, #D97706',
    manager: '#6366F1, #8B5CF6',
    executive: '#10B981, #059669',
    front_office: '#3B82F6, #2563EB',
    finance: '#EC4899, #DB2777',
  };
  return colors[role] || '#64748B, #475569';
}

