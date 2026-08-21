import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../services/api';
import { formatCurrency, formatDate } from '../utils/helpers';
import {
  Plus, Building2, MapPin, Rocket, Home,
  ShieldCheck, ArrowRight, Layers, CheckCircle2,
} from 'lucide-react';
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

  const totalUnits = projects.reduce((acc, p) => acc + (p.total_units || 0), 0);
  const availableUnits = projects.reduce((acc, p) => acc + (p.available_units || 0), 0);
  const soldUnits = totalUnits - availableUnits;
  const absorptionRate = totalUnits > 0 ? Math.round((soldUnits / totalUnits) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span className="live-pulse-dot" />
            <h1 className="page-title">Projects & Master Inventory</h1>
          </div>
          <p className="page-subtitle">
            {projects.length} developments · {availableUnits} available of {totalUnits} total units ({absorptionRate}% absorption)
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm">
          <Plus size={14} strokeWidth={2.5} /> Register New Project
        </button>
      </div>

      {/* ── Project Stats Overview ──────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem',
      }}>
        <div style={{ padding: '0.75rem 1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="icon-box icon-box-sm" style={{ background: 'var(--color-primary-dim)', color: 'var(--color-primary)' }}>
            <Building2 size={16} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{projects.length}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Active Developments</div>
          </div>
        </div>

        <div style={{ padding: '0.75rem 1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="icon-box icon-box-sm" style={{ background: 'var(--color-success-dim)', color: 'var(--color-success)' }}>
            <CheckCircle2 size={16} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-success)' }}>{availableUnits}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ready Inventory Units</div>
          </div>
        </div>

        <div style={{ padding: '0.75rem 1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="icon-box icon-box-sm" style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent)' }}>
            <Layers size={16} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-accent)' }}>{absorptionRate}%</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Overall Absorption Rate</div>
          </div>
        </div>
      </div>

      {/* ── Project Cards Grid ──────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <span className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Building2 size={24} strokeWidth={1.5} /></div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '1rem' }}>No projects registered yet</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Add your first residential or commercial project to start managing towers, floors, and unit matrices
            </p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm">
            <Plus size={14} strokeWidth={2.5} /> Add First Project
          </button>
        </div>
      ) : (
        <div className="projects-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {projects.map(proj => {
            const soldPct = proj.total_units ? Math.round(((proj.total_units - proj.available_units) / proj.total_units) * 100) : 0;
            return (
              <div
                key={proj.id}
                className="card"
                style={{
                  cursor: 'pointer',
                  transition: 'all 180ms ease',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  background: 'radial-gradient(circle at top right, rgba(232,160,32,0.05), transparent 70%), var(--color-surface)',
                }}
                onClick={() => navigate(`/projects/${proj.id}`)}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
              >
                <div>
                  {/* Status & RERA ribbon */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span className={`badge ${proj.status === 'active' ? 'badge-success' : proj.status === 'upcoming' ? 'badge-info' : 'badge-neutral'}`}>
                      {proj.status}
                    </span>
                    {proj.rera_number ? (
                      <span style={{ fontSize: '0.68rem', color: 'var(--color-success)', background: 'var(--color-success-dim)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-full)', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                        <ShieldCheck size={11} strokeWidth={2} /> RERA Verified
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>RERA Pending</span>
                    )}
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{proj.name}</h3>
                  {proj.developer_name && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 600, marginBottom: '0.35rem' }}>
                      by {proj.developer_name}
                    </p>
                  )}
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <MapPin size={13} strokeWidth={1.75} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                    {proj.location}
                  </p>

                  {/* Price Range Badge */}
                  {(proj.price_min || proj.price_max) && (
                    <div style={{
                      fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-primary)',
                      background: 'var(--color-primary-dim)', padding: '0.35rem 0.65rem',
                      borderRadius: 'var(--radius)', marginBottom: '0.875rem', width: 'fit-content',
                    }}>
                      {formatCurrency(proj.price_min)} – {formatCurrency(proj.price_max)}
                    </div>
                  )}

                  {/* Inventory Absorption Progress */}
                  <div style={{ marginBottom: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                      <span><strong style={{ color: 'var(--color-success)' }}>{proj.available_units}</strong> Available</span>
                      <span><strong>{proj.total_units}</strong> Total Units</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--color-surface-3)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${soldPct}%`,
                        background: soldPct > 75 ? 'var(--color-success)' : soldPct > 40 ? 'var(--color-primary)' : 'var(--color-info)',
                        borderRadius: '3px', transition: 'width 0.5s ease',
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                      <span>{soldPct}% Absorption Rate</span>
                      <span>{100 - soldPct}% Unsold</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Dates & View link */}
                <div style={{
                  borderTop: '1px solid var(--color-border-light)',
                  paddingTop: '0.75rem', marginTop: '0.5rem',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {proj.possession_date && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Home size={11} strokeWidth={1.75} /> Poss. {formatDate(proj.possession_date)}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    Explore Units <ArrowRight size={12} strokeWidth={2} />
                  </span>
                </div>
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
