import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../services/api';
import { formatCurrency } from '../utils/helpers';
import {
  Plus, Building2, MapPin, Users,
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

  const totalLeads = projects.reduce((acc, p) => acc + (p.lead_count || 0), 0);
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const upcomingProjects = projects.filter(p => p.status === 'upcoming').length;

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
            {projects.length} developments · {activeProjects} active projects · {totalLeads} total leads registered
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm">
          <Plus size={14} strokeWidth={2.5} /> Register New Project
        </button>
      </div>

      {/* ── Project Stats Overview ──────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem',
      }}>
        <div style={{ padding: '0.75rem 1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="icon-box icon-box-sm" style={{ background: 'var(--color-primary-dim)', color: 'var(--color-primary)' }}>
            <Building2 size={16} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{projects.length}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Projects</div>
          </div>
        </div>

        <div style={{ padding: '0.75rem 1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="icon-box icon-box-sm" style={{ background: 'var(--color-success-dim)', color: 'var(--color-success)' }}>
            <CheckCircle2 size={16} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-success)' }}>{activeProjects}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Active Projects</div>
          </div>
        </div>

        <div style={{ padding: '0.75rem 1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="icon-box icon-box-sm" style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent)' }}>
            <Layers size={16} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-accent)' }}>{upcomingProjects}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Upcoming Projects</div>
          </div>
        </div>

        <div style={{ padding: '0.75rem 1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="icon-box icon-box-sm" style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
            <Users size={16} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#6366f1' }}>{totalLeads}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Leads Registered</div>
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
            return (
              <div
                key={proj.id}
                className="card"
                style={{
                  cursor: 'pointer',
                  transition: 'all 180ms ease',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  padding: 0, overflow: 'hidden',
                }}
                onClick={() => navigate(`/projects/${proj.id}`)}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
              >
                {/* ── Project Image ── */}
                <div style={{ position: 'relative', height: 160, overflow: 'hidden', flexShrink: 0 }}>
                  {proj.brochure_url ? (
                    <img
                      src={proj.brochure_url}
                      alt={proj.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 300ms ease' }}
                      onMouseEnter={e => e.target.style.transform = 'scale(1.04)'}
                      onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1f35, #2d3561)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building2 size={40} strokeWidth={1} color="rgba(255,255,255,0.2)" />
                    </div>
                  )}
                  {/* Gradient overlay with status & RERA */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 55%)' }} />
                  <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', right: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={`badge ${proj.status === 'active' ? 'badge-success' : proj.status === 'upcoming' ? 'badge-info' : 'badge-neutral'}`}>
                      {proj.status}
                    </span>
                    {proj.rera_number && (
                      <span style={{ fontSize: '0.65rem', color: '#4ade80', background: 'rgba(0,0,0,0.55)', padding: '0.2rem 0.45rem', borderRadius: 'var(--radius-full)', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600, backdropFilter: 'blur(4px)' }}>
                        <ShieldCheck size={10} strokeWidth={2} /> RERA
                      </span>
                    )}
                  </div>
                  {/* Name overlay on image bottom */}
                  <div style={{ position: 'absolute', bottom: '0.6rem', left: '0.75rem', right: '0.75rem' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.5)', lineHeight: 1.2 }}>{proj.name}</div>
                    {proj.developer_name && (
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)', marginTop: '0.15rem' }}>by {proj.developer_name}</div>
                    )}
                  </div>
                </div>

                <div style={{ padding: '0.875rem' }}>
                  {/* Location */}
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <MapPin size={13} strokeWidth={1.75} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                    {proj.location}
                  </p>

                  {/* Price Range */}
                  {(proj.price_min || proj.price_max) && (
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)', background: 'var(--color-primary-dim)', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius)', marginBottom: '0.75rem', width: 'fit-content' }}>
                      {formatCurrency(proj.price_min)} – {formatCurrency(proj.price_max)}
                    </div>
                  )}

                  {/* Lead Count */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.65rem', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius)', marginBottom: '0.5rem' }}>
                    <Users size={14} strokeWidth={2} color="#6366f1" />
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#6366f1' }}>{proj.lead_count || 0}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Leads Registered</span>
                  </div>
                </div>

                {/* Card Footer */}
                <div style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: '0.65rem', marginTop: '0.25rem', marginLeft: '0.875rem', marginRight: '0.875rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    View Details <ArrowRight size={12} strokeWidth={2} />
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
