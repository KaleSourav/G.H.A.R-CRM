import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PIPELINE_STAGES, STAGE_CONFIG } from '../utils/constants';
import { formatCurrency, formatPhone, formatRelative, getInitials } from '../utils/helpers';
import {
  Users, Plus, AlertTriangle, CheckSquare, Clock,
  Trophy, Building2, TrendingUp, BarChart2, Award,
  ArrowUpRight, ArrowDownRight, Sparkles, Filter,
  Layers, ArrowRight, ShieldCheck, Zap,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import toast from 'react-hot-toast';

const PIE_COLORS = ['#E8A020','#4F6FE8','#22C55E','#EF4444','#3B82F6','#8B5CF6','#EC4899','#14B8A6'];

function StatCard({ title, value, subtitle, icon: Icon, color = 'var(--color-primary)', trend, trendText, glowColor }) {
  return (
    <div className="stat-card" style={{
      '--accent-color': color,
      '--card-glow': glowColor || `${color}15`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div className="stat-card-icon" style={{
          background: `${color}14`,
          borderColor: `${color}30`,
          color: color,
        }}>
          <Icon size={18} strokeWidth={2} />
        </div>
        {trendText && (
          <span className={`metric-trend ${trend >= 0 ? 'up' : 'down'}`}>
            {trend >= 0 ? <ArrowUpRight size={12} strokeWidth={2.5} /> : <ArrowDownRight size={12} strokeWidth={2.5} />}
            {trendText}
          </span>
        )}
      </div>
      <div>
        <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>
          {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{title}</div>
      </div>
      {subtitle && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem', paddingTop: '0.4rem', borderTop: '1px solid var(--color-border-light)' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '0.75rem 1rem',
      fontSize: '0.8rem',
      boxShadow: 'var(--shadow-xl)',
    }}>
      <p style={{ fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>{label}</p>
      {payload.map((entry, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: entry.color }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color }} />
          <span>{entry.name}:</span>
          <strong>{entry.value}</strong>
        </div>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { user, isAdmin, isManager, isExecutive } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await dashboardAPI.get();
      setData(d);
    } catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <span className="spinner" style={{ width: 36, height: 36 }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading intelligence dashboard...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { totals, byStage, bySource, byPriority, slaLeads, leaderboard, projects } = data;

  const funnelData = PIPELINE_STAGES.slice(0, 8).map(stage => ({
    stage: STAGE_CONFIG[stage]?.short || stage,
    count: byStage[stage] || 0,
    color: STAGE_CONFIG[stage]?.color || '#64748B',
  }));

  const sourceData = Object.entries(bySource || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  const totalInventoryUnits = projects?.reduce((acc, p) => acc + (p.total_units || 0), 0) || 0;
  const availableInventoryUnits = projects?.reduce((acc, p) => acc + (p.available_units || 0), 0) || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── Executive Hero Banner ────────────────────────────────────────── */}
      <div className="hero-banner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span className="live-pulse-dot" />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Executive Intelligence Suite
              </span>
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Good {getTimeOfDay()}, {user?.name?.split(' ')[0] || 'Partner'}
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem', maxWidth: '600px' }}>
              Here is your high-velocity sales snapshot for {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}.
            </p>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="quick-action-bar">
            <button onClick={() => navigate('/leads?new=true')} className="btn btn-primary btn-sm">
              <Plus size={14} strokeWidth={2.5} /> Add Lead
            </button>
            <button onClick={() => navigate('/pipeline')} className="btn btn-secondary btn-sm">
              <Layers size={14} strokeWidth={2} /> Pipeline
            </button>
            <button onClick={() => navigate('/tasks')} className="btn btn-secondary btn-sm">
              <CheckSquare size={14} strokeWidth={2} /> Tasks
            </button>
          </div>
        </div>

        {/* Live Overview Badges */}
        <div style={{
          display: 'flex', gap: '1rem', flexWrap: 'wrap',
          marginTop: '1.25rem', paddingTop: '1rem',
          borderTop: '1px solid var(--color-border)',
          fontSize: '0.78rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)' }} />
            <span>Active Pipeline: <strong style={{ color: 'var(--text-primary)' }}>{totals.leads} Leads</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)' }} />
            <span>Win Rate: <strong style={{ color: 'var(--color-success)' }}>{totals.conversionRate}%</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-info)' }} />
            <span>Units Available: <strong style={{ color: 'var(--text-primary)' }}>{availableInventoryUnits} / {totalInventoryUnits}</strong></span>
          </div>
          {totals.slaBreaches > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-danger)' }}>
              <AlertTriangle size={13} strokeWidth={2} />
              <span><strong>{totals.slaBreaches} SLA Breaches</strong> require action</span>
            </div>
          )}
        </div>
      </div>

      {/* ── KPI Metric Cards ────────────────────────────────────────────── */}
      <div className="stats-grid">
        <StatCard
          title="Total Leads"
          value={totals.leads}
          subtitle="All active enquiries in CRM"
          icon={Users}
          color="#4F6FE8"
          glowColor="rgba(79, 111, 232, 0.12)"
          trend={12}
          trendText="+12% vs last month"
        />
        <StatCard
          title="New This Month"
          value={totals.newThisMonth}
          subtitle="Acquisition momentum"
          icon={Plus}
          color="#3B82F6"
          glowColor="rgba(59, 130, 246, 0.12)"
          trend={8}
          trendText="Strong intake"
        />
        <StatCard
          title="Conversions"
          value={totals.converted}
          subtitle={`${totals.conversionRate}% overall win rate`}
          icon={Trophy}
          color="var(--color-success)"
          glowColor="rgba(34, 197, 94, 0.12)"
          trend={totals.conversionRate >= 15 ? 15 : 5}
          trendText={`${totals.conversionRate}% Win Rate`}
        />
        <StatCard
          title="SLA Breaches"
          value={totals.slaBreaches}
          subtitle={totals.slaBreaches === 0 ? 'All responses on-time' : 'Response window exceeded'}
          icon={AlertTriangle}
          color={totals.slaBreaches > 0 ? 'var(--color-danger)' : 'var(--color-success)'}
          glowColor={totals.slaBreaches > 0 ? 'rgba(239, 68, 68, 0.14)' : 'rgba(34, 197, 94, 0.12)'}
          trend={totals.slaBreaches > 0 ? -1 : 1}
          trendText={totals.slaBreaches === 0 ? 'Optimal' : 'Needs attention'}
        />
        <StatCard
          title="Tasks Due Today"
          value={totals.tasksDueToday}
          subtitle="Client follow-ups & calls"
          icon={Clock}
          color="var(--color-primary)"
          glowColor="rgba(232, 160, 32, 0.12)"
        />
        <StatCard
          title="Overdue Tasks"
          value={totals.overdueTasks}
          subtitle={totals.overdueTasks === 0 ? 'No pending backlog' : 'Action items overdue'}
          icon={CheckSquare}
          color={totals.overdueTasks > 0 ? 'var(--color-danger)' : 'var(--color-success)'}
          glowColor={totals.overdueTasks > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.12)'}
        />
      </div>

      {/* ── Interactive Charts Row ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: '1.25rem' }} className="charts-row">
        {/* Funnel Bar Chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className="icon-box icon-box-sm" style={{ background: 'var(--color-primary-dim)', color: 'var(--color-primary)' }}>
                <BarChart2 size={15} strokeWidth={2} />
              </div>
              <div>
                <h2 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Pipeline Funnel Distribution</h2>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Real-time lead counts across 8 core stages</p>
              </div>
            </div>
            <button onClick={() => navigate('/pipeline')} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', gap: '0.25rem' }}>
              Open Board <ArrowRight size={13} strokeWidth={2} />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={funnelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="stage" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Leads" radius={[4, 4, 0, 0]}>
                {funnelData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Source Breakdown Pie Chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className="icon-box icon-box-sm" style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent)' }}>
                <TrendingUp size={15} strokeWidth={2} />
              </div>
              <div>
                <h2 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Lead Acquisition Channels</h2>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Top inbound and referral sources</p>
              </div>
            </div>
          </div>

          {sourceData.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-state-icon"><BarChart2 size={20} /></div>
              <span style={{ fontSize: '0.8rem' }}>No data yet</span>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%" cy="50%"
                    innerRadius={44} outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {sourceData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginTop: '0.5rem' }}>
                {sourceData.slice(0, 6).map((s, i) => (
                  <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0.5rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius)', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{s.name}</span>
                    </div>
                    <strong style={{ color: 'var(--text-primary)', marginLeft: '0.3rem', flexShrink: 0 }}>{s.value}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Action Items & Insights Row ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* SLA Breach Urgent List */}
        {slaLeads.length > 0 && (
          <div className="card" style={{ border: '1px solid rgba(239,68,68,0.25)', background: 'radial-gradient(circle at top right, rgba(239,68,68,0.06), transparent 70%), var(--color-surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
              <div className="icon-box icon-box-sm" style={{ background: 'var(--color-danger-dim)', color: 'var(--color-danger)' }}>
                <AlertTriangle size={15} strokeWidth={2} />
              </div>
              <div>
                <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-danger)' }}>
                  SLA Breach Action Center
                </h2>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Leads requiring immediate first response</p>
              </div>
              <span style={{
                marginLeft: 'auto', fontSize: '0.68rem', fontWeight: 700,
                background: 'var(--color-danger-dim)', color: 'var(--color-danger)',
                padding: '0.15rem 0.55rem', borderRadius: 'var(--radius-full)',
                border: '1px solid rgba(239,68,68,0.3)',
              }}>{slaLeads.length} Urgent</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {slaLeads.map(lead => (
                <div
                  key={lead.id}
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  style={{
                    padding: '0.625rem 0.875rem',
                    background: 'var(--color-surface-2)',
                    border: '1px solid rgba(239,68,68,0.18)',
                    borderRadius: 'var(--radius)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer', transition: 'all 120ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-danger)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(239,68,68,0.18)'}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{lead.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '0.1rem' }}>
                      {lead.source} · {lead.assignee?.name || 'Unassigned'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--color-danger)', fontSize: '0.72rem', fontWeight: 600 }}>
                      {formatRelative(lead.created_at)}
                    </div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-primary)' }}>Take Action →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Leaderboard */}
        {(isAdmin || isManager) && leaderboard.length > 0 && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="icon-box icon-box-sm" style={{ background: 'var(--color-primary-dim)', color: 'var(--color-primary)' }}>
                  <Award size={15} strokeWidth={2} />
                </div>
                <div>
                  <h2 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Executive Leaderboard</h2>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ranked by conversion performance</p>
                </div>
              </div>
              <button onClick={() => navigate('/team')} className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem' }}>
                Team View →
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {leaderboard.slice(0, 5).map((exec, i) => (
                <div key={exec.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.625rem',
                  padding: '0.5rem 0.625rem',
                  background: i === 0 ? 'rgba(232,160,32,0.06)' : 'var(--color-surface-2)',
                  border: i === 0 ? '1px solid rgba(232,160,32,0.2)' : '1px solid transparent',
                  borderRadius: 'var(--radius)',
                }}>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 800,
                    width: 20, height: 20,
                    borderRadius: '50%',
                    background: i === 0 ? 'var(--color-primary)' : i === 1 ? '#94A3B8' : i === 2 ? '#B45309' : 'var(--color-surface-3)',
                    color: i < 3 ? '#080E1A' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #4F6FE8, #7C3AED)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.68rem', fontWeight: 700, color: 'white', flexShrink: 0,
                  }}>
                    {getInitials(exec.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {exec.name}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {exec.total_leads} leads · {exec.converted} converted
                    </div>
                  </div>
                  <div style={{
                    fontSize: '0.85rem', fontWeight: 800, flexShrink: 0,
                    color: exec.conversion_rate >= 20 ? 'var(--color-success)' : exec.conversion_rate >= 10 ? 'var(--color-warning)' : 'var(--text-muted)',
                  }}>
                    {exec.conversion_rate}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Project Inventory Snapshot */}
        {(isAdmin || isManager) && projects.length > 0 && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="icon-box icon-box-sm" style={{ background: 'var(--color-info-dim)', color: 'var(--color-info)' }}>
                  <Building2 size={15} strokeWidth={2} />
                </div>
                <div>
                  <h2 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Active Projects Absorption</h2>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Inventory availability ratio</p>
                </div>
              </div>
              <button onClick={() => navigate('/projects')} className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem' }}>
                Inventory →
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {projects.map(proj => {
                const availPct = proj.total_units ? Math.round((proj.available_units / proj.total_units) * 100) : 0;
                return (
                  <div
                    key={proj.id}
                    onClick={() => navigate(`/projects/${proj.id}`)}
                    style={{
                      padding: '0.625rem 0.75rem',
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      transition: 'border-color 120ms',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {proj.name}
                      </div>
                      <span className={`badge ${proj.status === 'active' ? 'badge-success' : proj.status === 'upcoming' ? 'badge-info' : 'badge-neutral'}`} style={{ marginLeft: '0.5rem', fontSize: '0.6rem' }}>
                        {proj.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                      <span>{proj.available_units} units available</span>
                      <strong style={{ color: 'var(--text-secondary)' }}>{availPct}% unsold</strong>
                    </div>
                    <div style={{ height: 4, background: 'var(--color-surface-3)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${availPct}%`,
                        background: availPct > 50 ? 'var(--color-success)' : availPct > 20 ? 'var(--color-warning)' : 'var(--color-danger)',
                        borderRadius: '3px', transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .charts-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
