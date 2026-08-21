import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../services/api';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Plus, Building2, MapPin, Rocket, Home } from 'lucide-react';
import ProjectForm from '../components/projects/ProjectForm';
import toast from 'react-hot-toast';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await projectsAPI.list();
      setProjects(data || []);
    } catch { toast.error('Failed to load projects'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects & Inventory</h1>
          <p className="page-subtitle">{projects.length} projects</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm">
          <Plus size={13} strokeWidth={2.5} /> Add Project
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><span className="spinner" style={{ width: 28, height: 28 }} /></div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Building2 size={22} strokeWidth={1.5} /></div>
          <div>
            <p style={{ fontWeight: 600 }}>No projects yet</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Add your first project to manage inventory</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm">
            <Plus size={13} strokeWidth={2.5} /> Add Project
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {projects.map(proj => {
            const availPct = proj.total_units ? Math.round(((proj.total_units - proj.available_units) / proj.total_units) * 100) : 0;
            return (
              <div
                key={proj.id}
                className="card"
                style={{ cursor: 'pointer', transition: 'all 200ms' }}
                onClick={() => navigate(`/projects/${proj.id}`)}
              >
                {/* Status ribbon */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <span className={`badge ${proj.status === 'active' ? 'badge-success' : proj.status === 'upcoming' ? 'badge-info' : 'badge-neutral'}`}>
                    {proj.status}
                  </span>
                  {proj.rera_number && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', background: 'var(--color-surface-2)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      RERA: {proj.rera_number}
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>{proj.name}</h3>
                {proj.developer_name && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{proj.developer_name}</p>
                )}
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <MapPin size={12} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                  {proj.location}
                </p>

                {/* Price range */}
                {(proj.price_min || proj.price_max) && (
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.75rem' }}>
                    {formatCurrency(proj.price_min)} – {formatCurrency(proj.price_max)}
                  </div>
                )}

                {/* Inventory bar */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    <span>{proj.available_units} available</span>
                    <span>{proj.total_units} total units</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--color-surface-3)', borderRadius: '3px' }}>
                    <div style={{
                      height: '100%', width: `${availPct}%`,
                      background: availPct > 70 ? 'var(--color-danger)' : availPct > 40 ? 'var(--color-warning)' : 'var(--color-success)',
                      borderRadius: '3px', transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                    {availPct}% inventory booked/sold
                  </div>
                </div>

                {/* Dates */}
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {proj.launch_date && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Rocket size={11} strokeWidth={1.75} /> Launch: {formatDate(proj.launch_date)}
                    </span>
                  )}
                  {proj.possession_date && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Home size={11} strokeWidth={1.75} /> Possession: {formatDate(proj.possession_date)}
                    </span>
                  )}
                </div>

                {/* Amenities */}
                {proj.amenities?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.75rem' }}>
                    {proj.amenities.slice(0, 4).map(a => (
                      <span key={a} style={{
                        fontSize: '0.65rem', padding: '0.2rem 0.5rem',
                        background: 'var(--color-surface-2)', borderRadius: '999px', color: 'var(--text-secondary)',
                      }}>{a}</span>
                    ))}
                    {proj.amenities.length > 4 && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>+{proj.amenities.length - 4} more</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <ProjectForm
          onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}
