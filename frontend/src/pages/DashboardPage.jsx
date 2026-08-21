import { useState, useEffect, useCallback } from 'react';
import { dashboardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PIPELINE_STAGES, STAGE_CONFIG } from '../utils/constants';
import { formatCurrency, formatPhone, formatRelative, getInitials } from '../utils/helpers';
import {
  Users, Plus, AlertTriangle, CheckSquare, Clock,
  Trophy, Building2, TrendingUp, BarChart2, Award,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import toast from 'react-hot-toast';

const PIE_COLORS = ['#E8A020','#4F6FE8','#22C55E','#EF4444','#3B82F6','#8B5CF6','#EC4899','#14B8A6'];

function StatCard({ title, value, subtitle, icon: Icon, color = 'var(--color-primary)', trend }) {
  return (
    <div className="stat-card" style={{ '--accent-color': color }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem' }}>
        <div style={{
          width: 32, height: 32,
          background: `${color}18`,
          borderRadius: 'var(--radius)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={16} strokeWidth={1.75} color={color} />
        </div>
        {trend !== undefined && (
          <span style={{ fontSize: '0.72rem', color: trend >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: '0.2rem' }}>
        {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{title}</div>
      {subtitle && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{subtitle}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--color-surface-2)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius)', padding: '0.625rem 0.875rem',
      fontSize: '0.8rem', boxShadow: 'var(--shadow-lg)',
    }}>
      <p style={{ fontWeight: 600, marginBottom: '0.2rem', color: 'var(--text-primary)' }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: <strong>{entry.value}</strong>
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { user, isAdmin, isManager, isExecutive } = useAuth();
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
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <span className="spinner" style={{ width: 32, height: 32 }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading dashboard...</span>
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div>
        <h1 className="page-title">
          {isExecutive ? `Good ${getTimeOfDay()}, ${user?.name?.split(' ')[0]}` : 'Dashboard'}
        </h1>
        <p className="page-subtitle">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <StatCard title="Total Leads" value={totals.leads} icon={Users} color="#4F6FE8" />
        <StatCard title="New This Month" value={totals.newThisMonth} icon={Plus} color="#3B82F6" />
        <StatCard
          title="Conversions" value={totals.converted}
          subtitle={`${totals.conversionRate}% conversion rate`} icon={Trophy}
          color="var(--color-success)"
        />
        <StatCard
          title="SLA Breaches" value={totals.slaBreaches}
          icon={AlertTriangle}
          color={totals.slaBreaches > 0 ? 'var(--color-danger)' : 'var(--color-success)'}
        />
        <StatCard title="Tasks Today" value={totals.tasksDueToday} icon={Clock} color="var(--color-primary)" />
        <StatCard
          title="Overdue Tasks" value={totals.overdueTasks}
          icon={CheckSquare}
          color={totals.overdueTasks > 0 ? 'var(--color-danger)' : 'var(--color-success)'}
        />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1.25rem' }}
           className="charts-row">
        {/* Funnel Bar Chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.125rem' }}>
            <BarChart2 size={16} strokeWidth={1.75} color="var(--text-muted)" />
            <h2 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Pipeline Funnel</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={funnelData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="stage" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Leads" radius={[3, 3, 0, 0]}>
                {funnelData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Source Pie Chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.125rem' }}>
            <TrendingUp size={16} strokeWidth={1.75} color="var(--text-muted)" />
            <h2 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Lead Sources</h2>
          </div>
          {sourceData.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-state-icon"><BarChart2 size={22} /></div>
              <span style={{ fontSize: '0.8rem' }}>No data yet</span>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%" cy="50%"
                    innerRadius={45} outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {sourceData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem' }}>
                {sourceData.slice(0, 4).map((s, i) => (
                  <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                    </div>
                    <strong style={{ color: 'var(--text-primary)', flexShrink: 0, marginLeft: '0.5rem' }}>{s.value}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {/* SLA Breach Alerts */}
        {slaLeads.length > 0 && (
          <div className="card" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
              <AlertTriangle size={15} strokeWidth={1.75} color="var(--color-danger)" />
              <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-danger)' }}>
                SLA Breach Alerts
              </h2>
              <span style={{
                marginLeft: 'auto', fontSize: '0.68rem', fontWeight: 700,
                background: 'var(--color-danger-dim)', color: 'var(--color-danger)',
                padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-full)',
                border: '1px solid rgba(239,68,68,0.25)',
              }}>{slaLeads.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {slaLeads.map(lead => (
                <div key={lead.id} style={{
                  padding: '0.575rem 0.75rem',
                  background: 'rgba(239,68,68,0.04)',
                  border: '1px solid rgba(239,68,68,0.12)',
                  borderRadius: 'var(--radius)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{lead.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.1rem' }}>
                      {lead.source} · {lead.assignee?.name || 'Unassigned'}
                    </div>
                  </div>
                  <div style={{ color: 'var(--color-danger)', fontSize: '0.7rem', textAlign: 'right', flexShrink: 0, marginLeft: '0.5rem' }}>
                    {formatRelative(lead.created_at)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Leaderboard */}
        {(isAdmin || isManager) && leaderboard.length > 0 && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
              <Award size={15} strokeWidth={1.75} color="var(--color-primary)" />
              <h2 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Team Leaderboard</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {leaderboard.slice(0, 6).map((exec, i) => (
                <div key={exec.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.625rem',
                  padding: '0.45rem 0.5rem',
                  background: i === 0 ? 'rgba(232,160,32,0.05)' : 'transparent',
                  borderRadius: 'var(--radius)',
                }}>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 700,
                    width: 18, textAlign: 'center', flexShrink: 0,
                    color: i < 3 ? 'var(--color-primary)' : 'var(--text-muted)',
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
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exec.name}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{exec.total_leads} leads · {exec.converted} closed</div>
                  </div>
                  <div style={{
                    fontSize: '0.85rem', fontWeight: 700, flexShrink: 0,
                    color: exec.conversion_rate >= 20 ? 'var(--color-success)' : exec.conversion_rate >= 10 ? 'var(--color-warning)' : 'var(--text-muted)',
                  }}>
                    {exec.conversion_rate}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Project Inventory */}
        {(isAdmin || isManager) && projects.length > 0 && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
              <Building2 size={15} strokeWidth={1.75} color="var(--text-muted)" />
              <h2 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Project Inventory</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {projects.map(proj => {
                const availPct = proj.total_units ? Math.round((proj.available_units / proj.total_units) * 100) : 0;
                return (
                  <div key={proj.id} style={{
                    padding: '0.575rem 0.75rem',
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{proj.name}</div>
                      <span className={`badge ${proj.status === 'active' ? 'badge-success' : proj.status === 'upcoming' ? 'badge-info' : 'badge-neutral'}`} style={{ marginLeft: '0.5rem', flexShrink: 0 }}>
                        {proj.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                      <span>{proj.available_units} available</span>
                      <span>{proj.total_units} total</span>
                    </div>
                    <div style={{ height: 3, background: 'var(--color-surface-3)', borderRadius: '2px' }}>
                      <div style={{
                        height: '100%', width: `${availPct}%`,
                        background: availPct > 50 ? 'var(--color-success)' : availPct > 20 ? 'var(--color-warning)' : 'var(--color-danger)',
                        borderRadius: '2px', transition: 'width 0.5s ease',
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
