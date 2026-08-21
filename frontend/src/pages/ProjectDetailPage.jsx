import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI } from '../services/api';
import { formatCurrency } from '../utils/helpers';
import { Plus, MapPin } from 'lucide-react';
import UnitGrid from '../components/projects/UnitGrid';
import UnitForm from '../components/projects/UnitForm';
import toast from 'react-hot-toast';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, unitsRes] = await Promise.all([
        projectsAPI.get(id),
        projectsAPI.getUnits(id, { status: filterStatus || undefined }),
      ]);
      setProject(projRes.data);
      setUnits(unitsRes.data || []);
    } catch { toast.error('Failed to load project'); navigate('/projects'); }
    finally { setLoading(false); }
  }, [id, filterStatus, navigate]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><span className="spinner" style={{ width: 28, height: 28 }} /></div>;
  if (!project) return null;

  const statusCounts = units.reduce((acc, u) => { acc[u.status] = (acc[u.status] || 0) + 1; return acc; }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <button onClick={() => navigate('/projects')} className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}>← Back to Projects</button>

      {/* Project header */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{project.name}</h1>
              <span className={`badge ${project.status === 'active' ? 'badge-success' : 'badge-info'}`}>{project.status}</span>
              {project.rera_number && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--color-surface-2)', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                  RERA: {project.rera_number}
                </span>
              )}
            </div>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              {project.developer_name && <span>{project.developer_name} · </span>}
              <MapPin size={12} strokeWidth={1.75} style={{ flexShrink: 0 }} />
              {project.location}
            </p>
          </div>
          <button onClick={() => setShowUnitForm(true)} className="btn btn-primary btn-sm">
            <Plus size={13} strokeWidth={2.5} /> Add Unit
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Available', count: statusCounts.available || 0, color: 'var(--color-success)' },
            { label: 'Held', count: statusCounts.held || 0, color: 'var(--color-warning)' },
            { label: 'Booked', count: statusCounts.booked || 0, color: 'var(--color-accent)' },
            { label: 'Sold', count: statusCounts.sold || 0, color: 'var(--color-danger)' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{s.label}</div>
            </div>
          ))}
          <div style={{ width: '1px', background: 'var(--color-border)', margin: '0 0.5rem' }} />
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>
              {formatCurrency(project.price_min)} – {formatCurrency(project.price_max)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Price Range</div>
          </div>
        </div>

        {/* Amenities */}
        {project.amenities?.length > 0 && (
          <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {project.amenities.map(a => (
              <span key={a} style={{
                fontSize: '0.72rem', padding: '0.25rem 0.6rem',
                background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                borderRadius: '999px', color: 'var(--text-secondary)',
              }}>{a}</span>
            ))}
          </div>
        )}
      </div>

      {/* Unit filter */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Filter units:</span>
        {['', 'available', 'held', 'booked', 'sold'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-secondary'}`}
          >
            {s || 'All'} {s && `(${statusCounts[s] || 0})`}
          </button>
        ))}
      </div>

      {/* Unit Grid */}
      <UnitGrid
        units={units}
        projectId={id}
        onUnitUpdated={load}
      />

      {showUnitForm && (
        <UnitForm
          projectId={id}
          onClose={() => setShowUnitForm(false)}
          onSave={() => { setShowUnitForm(false); load(); }}
        />
      )}
    </div>
  );
}
