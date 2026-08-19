import { useState, useEffect, useCallback } from 'react';
import { dashboardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PIPELINE_STAGES, STAGE_CONFIG } from '../utils/constants';
import { formatCurrency, formatPhone, formatRelative, getInitials } from '../utils/helpers';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import toast from 'react-hot-toast';

const PIE_COLORS = ['#F59E0B','#6366F1','#10B981','#EF4444','#3B82F6','#8B5CF6','#EC4899','#14B8A6'];

function StatCard({ title, value, subtitle, icon, color = 'var(--color-primary)', trend }) {
  return (
    <div className="stat-card" style={{ '--accent-color': color }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '1.5rem' }}>{icon}</div>
        {trend !== undefined && (
          <span style={{ fontSize: '0.75rem', color: trend >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
        {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{title}</div>
      {subtitle && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{subtitle}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '8px', padding: '0.75rem 1rem',
      fontSize: '0.8rem',
    }}>
      <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }}>{entry.name}: <strong>{entry.value}</strong></p>
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
          <span className="spinner" style={{ width: 36, height: 36 }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { totals, byStage, bySource, byPriority, slaLeads, leaderboard, projects } = data;

  // Funnel data for bar chart
  const funnelData = PIPELINE_STAGES.slice(0, 8).map(stage => ({
    stage: STAGE_CONFIG[stage]?.short || stage,
    count: byStage[stage] || 0,
    color: STAGE_CONFIG[stage]?.color || '#64748B',
  }));

  // Source pie data
  const sourceData = Object.entries(bySource || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 className="page-title">
          {isExecutive ? `Good ${getTimeOfDay()}, ${user?.name?.split(' ')[0]}!` : 'Dashboard'}
        </h1>
        <p className="page-subtitle">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <StatCard title="Total Leads" value={totals.leads} icon="👥" color="#6366F1" />
        <StatCard title="New This Month" value={totals.newThisMonth} icon="📥" color="#3B82F6" />
        <StatCard
          title="Conversions" value={totals.converted}
          subtitle={`${totals.conversionRate}% conversion rate`} icon="🏆"
          color="var(--color-success)"
        />
        <StatCard
          title="SLA Breaches" value={totals.slaBreaches}
          icon="⚠️" color={totals.slaBreaches > 0 ? 'var(--color-danger)' : 'var(--color-success)'}
        />
        <StatCard title="Tasks Today" value={totals.tasksDueToday} icon="📅" color="#F59E0B" />
        <StatCard
          title="Overdue Tasks" value={totals.overdueTasks}
          icon="🔴" color={totals.overdueTasks > 0 ? 'var(--color-danger)' : 'var(--color-success)'}
        />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Funnel Bar Chart */}
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Lead Pipeline Funnel</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={funnelData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="stage" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Leads" radius={[4, 4, 0, 0]}>
                {funnelData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Source Pie Chart */}
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Lead Sources</h2>
          {sourceData.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <span>📊</span>
              <span style={{ fontSize: '0.8rem' }}>No data yet</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={90}
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
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem' }}>
            {sourceData.slice(0, 4).map((s, i) => (
              <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {s.name}
                </div>
                <strong style={{ color: 'var(--text-primary)' }}>{s.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* SLA Breach Alerts */}
        {slaLeads.length > 0 && (
          <div className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-danger)' }}>
              ⚠️ SLA Breach Alerts ({slaLeads.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {slaLeads.map(lead => (
                <div key={lead.id} style={{
                  padding: '0.625rem 0.75rem',
                  background: 'rgba(239,68,68,0.05)',
                  border: '1px solid rgba(239,68,68,0.15)',
                  borderRadius: '8px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: '0.8rem',
                }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{lead.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                      {lead.source} · {lead.assignee?.name || 'Unassigned'}
                    </div>
                  </div>
                  <div style={{ color: 'var(--color-danger)', fontSize: '0.72rem', textAlign: 'right' }}>
                    Created<br />{formatRelative(lead.created_at)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Leaderboard (admin/manager only) */}
        {(isAdmin || isManager) && leaderboard.length > 0 && (
          <div className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
              🏆 Team Leaderboard
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {leaderboard.slice(0, 6).map((exec, i) => (
                <div key={exec.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.5rem',
                  background: i === 0 ? 'rgba(245,158,11,0.05)' : 'transparent',
                  borderRadius: '8px',
                }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, width: 20, color: i < 3 ? 'var(--color-primary)' : 'var(--text-muted)', textAlign: 'center' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </span>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700, color: 'white', flexShrink: 0,
                  }}>
                    {getInitials(exec.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exec.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{exec.total_leads} leads · {exec.converted} converted</div>
                  </div>
                  <div style={{
                    fontSize: '0.875rem', fontWeight: 700,
                    color: exec.conversion_rate >= 20 ? 'var(--color-success)' : exec.conversion_rate >= 10 ? 'var(--color-warning)' : 'var(--text-muted)',
                  }}>
                    {exec.conversion_rate}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects Summary */}
        {(isAdmin || isManager) && projects.length > 0 && (
          <div className="card" style={{ gridColumn: slaLeads.length === 0 ? '1 / -1' : 'auto' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>🏗️ Project Inventory</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {projects.map(proj => {
                const availPct = proj.total_units ? Math.round((proj.available_units / proj.total_units) * 100) : 0;
                return (
                  <div key={proj.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.625rem 0.75rem',
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proj.name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                        {proj.available_units} / {proj.total_units} units available
                      </div>
                      <div style={{
                        height: 4, background: 'var(--color-surface-3)', borderRadius: '2px', marginTop: '0.4rem',
                      }}>
                        <div style={{
                          height: '100%', width: `${availPct}%`,
                          background: availPct > 50 ? 'var(--color-success)' : availPct > 20 ? 'var(--color-warning)' : 'var(--color-danger)',
                          borderRadius: '2px', transition: 'width 0.5s ease',
                        }} />
                      </div>
                    </div>
                    <span className={`badge ${proj.status === 'active' ? 'badge-success' : proj.status === 'upcoming' ? 'badge-info' : 'badge-neutral'}`}>
                      {proj.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
