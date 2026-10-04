import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck, Users, AlertCircle, ArrowRightLeft, Search,
  Phone, MessageSquare, CheckCircle, Clock, Flame,
  UserPlus, SlidersHorizontal, CheckCheck, RefreshCw,
  ExternalLink, UserX,
} from 'lucide-react';
import { leadsAPI, teamAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  formatPhone, formatCurrency, formatRelative,
  getInitials, getWhatsAppUrl,
} from '../utils/helpers';
import { STAGE_CONFIG, PRIORITY_CONFIG } from '../utils/constants';
import { WhatsAppIcon } from './LeadsPage';
import toast from 'react-hot-toast';

export default function AssignedLeadsPage() {
  const { user, assignedStats, refreshAssignedStats } = useAuth();
  const navigate = useNavigate();

  // Active view tab: 'my' (Assigned to Me), 'all' (Team Workload), 'unassigned' (Unassigned Pool)
  const [activeTab, setActiveTab] = useState('my');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [bulkTargetUser, setBulkTargetUser] = useState('');
  const [subFilter, setSubFilter] = useState('all'); // 'all', 'new', 'hot'
  const [reassigningId, setReassigningId] = useState(null);

  // Load team members for assignment dropdowns
  const loadTeam = useCallback(async () => {
    try {
      const { data } = await teamAPI.list();
      setTeamMembers((data || []).filter(u => u.status === 'active'));
    } catch {}
  }, []);

  // Load leads based on current tab and filters
  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100, sort_by: 'assigned_at', sort_dir: 'desc' };

      if (activeTab === 'my') {
        params.assigned_to = 'me';
      } else if (activeTab === 'unassigned') {
        params.assigned_to = 'unassigned';
      }

      if (searchTerm) {
        params.search = searchTerm;
      }

      if (subFilter === 'new') {
        params.stage = 'New / Unassigned';
      } else if (subFilter === 'hot') {
        params.priority = 'hot';
      }

      const { data } = await leadsAPI.list(params);
      setLeads(data.leads || []);
      setSelectedLeads(new Set());
    } catch (err) {
      toast.error('Failed to load assigned leads');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm, subFilter]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // Handle single lead handoff/reassign
  const handleReassign = async (leadId, toUserId, leadName) => {
    if (!toUserId) return;
    setReassigningId(leadId);
    try {
      await leadsAPI.reassign(leadId, toUserId);
      const targetUser = teamMembers.find(u => u.id === toUserId);
      toast.success(`"${leadName}" transferred to ${targetUser?.name || 'team member'}`);
      await refreshAssignedStats();
      await loadLeads();
      await loadTeam();
    } catch (err) {
      toast.error('Failed to transfer lead');
    } finally {
      setReassigningId(null);
    }
  };

  // Handle bulk handoff of multiple leads
  const handleBulkReassign = async () => {
    if (!bulkTargetUser) {
      toast.error('Please select a team member to assign to');
      return;
    }
    if (!selectedLeads.size) {
      toast.error('Please select at least one lead');
      return;
    }

    const targetUser = teamMembers.find(u => u.id === bulkTargetUser);
    const count = selectedLeads.size;

    try {
      await leadsAPI.bulk('reassign', [...selectedLeads], { to_user_id: bulkTargetUser });
      toast.success(`Successfully assigned ${count} lead(s) to ${targetUser?.name || 'team member'}`);
      setSelectedLeads(new Set());
      setBulkTargetUser('');
      await refreshAssignedStats();
      await loadLeads();
      await loadTeam();
    } catch (err) {
      toast.error('Bulk reassignment failed');
    }
  };

  // Claim unassigned lead for self
  const handleClaimLead = async (leadId, leadName) => {
    if (!user?.id) return;
    try {
      await leadsAPI.reassign(leadId, user.id);
      toast.success(`You claimed "${leadName}"!`);
      await refreshAssignedStats();
      await loadLeads();
      await loadTeam();
    } catch {
      toast.error('Failed to claim lead');
    }
  };

  // Mark all assignment notifications read to clear red dot
  const handleAcknowledgeAssignments = async () => {
    try {
      await authAPI.readAllNotifications();
      await refreshAssignedStats();
      toast.success('All new assignments acknowledged');
    } catch {}
  };

  const toggleSelectLead = (id) => {
    setSelectedLeads(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map(l => l.id)));
    }
  };

  // Calculate team workload breakdown
  const totalAssignedInView = teamMembers.reduce((sum, m) => sum + (m.current_lead_count || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', maxWidth: '100%' }}>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
            <div style={{
              width: 34, height: 34, borderRadius: '8px',
              background: 'linear-gradient(135deg, #E8A020, #F59E0B)',
              color: '#080E1A', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UserCheck size={18} strokeWidth={2.5} />
            </div>
            <h1 className="page-title" style={{ margin: 0 }}>Lead Assignment Hub</h1>
            {assignedStats.hasPendingAlert && (
              <span style={{
                background: 'rgba(239,68,68,0.15)',
                color: 'var(--color-danger)',
                border: '1px solid rgba(239,68,68,0.3)',
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-danger)', animation: 'pulse 1.5s infinite' }} />
                {assignedStats.unreadAssignmentNotifs || assignedStats.newAssignedCount} New Assignments
              </span>
            )}
          </div>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Distribute, transfer, and balance client workload across team members in real-time
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {assignedStats.hasPendingAlert && (
            <button
              onClick={handleAcknowledgeAssignments}
              className="btn btn-secondary btn-sm"
              title="Clear notification alert"
              style={{ fontSize: '0.78rem' }}
            >
              <CheckCheck size={14} strokeWidth={2} /> Acknowledge All
            </button>
          )}
          <button
            onClick={() => { loadLeads(); refreshAssignedStats(); }}
            className="btn btn-secondary btn-sm btn-icon"
            title="Refresh assignments"
            aria-label="Refresh assignments"
          >
            <RefreshCw size={14} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      <div className="leads-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
        {/* Assigned to Me */}
        <div
          onClick={() => { setActiveTab('my'); setSubFilter('all'); }}
          style={{
            padding: '1rem',
            background: 'var(--color-surface)',
            border: `1.5px solid ${activeTab === 'my' && subFilter === 'all' ? 'var(--color-primary)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-lg)',
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Assigned to Me</span>
            <div className="icon-box icon-box-sm" style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent)' }}>
              <UserCheck size={16} strokeWidth={2.2} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.4rem', lineHeight: 1 }}>
            {assignedStats.assignedToMeCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            Clients currently on your desk
          </div>
        </div>

        {/* New / Uncontacted Assigned to Me */}
        <div
          onClick={() => { setActiveTab('my'); setSubFilter('new'); }}
          style={{
            padding: '1rem',
            background: 'var(--color-surface)',
            border: `1.5px solid ${subFilter === 'new' ? 'var(--color-danger)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-lg)',
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>New / Uncontacted</span>
            <div className="icon-box icon-box-sm" style={{ background: 'rgba(239,68,68,0.14)', color: 'var(--color-danger)' }}>
              <AlertCircle size={16} strokeWidth={2.2} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-danger)', marginTop: '0.4rem', lineHeight: 1 }}>
            {assignedStats.newAssignedCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            Awaiting first outreach
          </div>
        </div>

        {/* Unassigned Pool */}
        <div
          onClick={() => { setActiveTab('unassigned'); setSubFilter('all'); }}
          style={{
            padding: '1rem',
            background: 'var(--color-surface)',
            border: `1.5px solid ${activeTab === 'unassigned' ? 'var(--color-warning)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-lg)',
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Unassigned Pool</span>
            <div className="icon-box icon-box-sm" style={{ background: 'rgba(245,158,11,0.14)', color: 'var(--color-warning)' }}>
              <UserX size={16} strokeWidth={2.2} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-warning)', marginTop: '0.4rem', lineHeight: 1 }}>
            {assignedStats.unassignedCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            Waiting for assignment / claim
          </div>
        </div>

        {/* Team Workload */}
        <div
          onClick={() => { setActiveTab('all'); setSubFilter('all'); }}
          style={{
            padding: '1rem',
            background: 'var(--color-surface)',
            border: `1.5px solid ${activeTab === 'all' ? 'var(--color-info)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-lg)',
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Team Active Workload</span>
            <div className="icon-box icon-box-sm" style={{ background: 'rgba(59,130,246,0.14)', color: 'var(--color-info)' }}>
              <Users size={16} strokeWidth={2.2} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-info)', marginTop: '0.4rem', lineHeight: 1 }}>
            {totalAssignedInView}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            Across {teamMembers.length} active members
          </div>
        </div>
      </div>

      {/* ── Team Workload Distribution Bar ───────────────────────────────── */}
      <div className="card" style={{ padding: '0.875rem 1.125rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Team Load Balancer
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            One person overwhelmed? Transfer leads to team members below.
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {teamMembers.map(member => {
            const isMe = member.id === user?.id;
            return (
              <div
                key={member.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.45rem',
                  padding: '0.35rem 0.75rem',
                  background: isMe ? 'var(--color-primary-dim)' : 'var(--color-surface-2)',
                  border: `1px solid ${isMe ? 'rgba(232,160,32,0.3)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius)',
                  fontSize: '0.78rem',
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: isMe ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: isMe ? '#080E1A' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', fontWeight: 700,
                }}>
                  {getInitials(member.name)}
                </div>
                <span style={{ fontWeight: 600, color: isMe ? 'var(--color-primary)' : 'var(--text-primary)' }}>
                  {member.name} {isMe && '(You)'}
                </span>
                <span style={{
                  background: 'var(--color-surface)',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '999px',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--color-border)',
                }}>
                  {member.current_lead_count || 0} leads
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main Tab Navigation & Filter Controls ────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Main Tabs */}
          <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--color-surface)', padding: '0.25rem', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            <button
              onClick={() => { setActiveTab('my'); setSubFilter('all'); }}
              className={`btn btn-sm ${activeTab === 'my' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
            >
              Assigned to Me ({assignedStats.assignedToMeCount})
            </button>
            <button
              onClick={() => { setActiveTab('all'); setSubFilter('all'); }}
              className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
            >
              All Team Leads ({totalAssignedInView})
            </button>
            <button
              onClick={() => { setActiveTab('unassigned'); setSubFilter('all'); }}
              className={`btn btn-sm ${activeTab === 'unassigned' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
            >
              Unassigned ({assignedStats.unassignedCount})
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
            <Search size={14} strokeWidth={1.75} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search name, phone, project..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.2rem', fontSize: '0.82rem', height: 36 }}
            />
          </div>
        </div>

        {/* Sub-filters for active tab */}
        {activeTab === 'my' && (
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filter:</span>
            {[
              { id: 'all', label: 'All My Leads' },
              { id: 'new', label: `New / Uncontacted (${assignedStats.newAssignedCount})` },
              { id: 'hot', label: 'Hot Priority Only' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setSubFilter(f.id)}
                className={`btn btn-sm ${subFilter === f.id ? 'btn-secondary' : 'btn-ghost'}`}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.6rem',
                  borderColor: subFilter === f.id ? 'var(--color-primary)' : 'transparent',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Bulk Handoff Sticky Bar (When leads are selected) ─────────────── */}
      {selectedLeads.size > 0 && (
        <div style={{
          position: 'sticky', top: 'calc(var(--topbar-height) + 8px)', zIndex: 50,
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-primary)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.75rem 1.25rem',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          animation: 'slideDown 150ms ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{
              background: 'var(--color-primary)',
              color: '#080E1A',
              fontWeight: 800,
              fontSize: '0.75rem',
              padding: '0.15rem 0.5rem',
              borderRadius: '999px',
            }}>
              {selectedLeads.size} selected
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Bulk Reassign / Hand Off to teammate:
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select
              className="form-select"
              value={bulkTargetUser}
              onChange={e => setBulkTargetUser(e.target.value)}
              style={{ fontSize: '0.82rem', height: 36, minWidth: 200 }}
            >
              <option value="">Select team member...</option>
              {teamMembers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.current_lead_count || 0} active)
                </option>
              ))}
            </select>

            <button
              onClick={handleBulkReassign}
              className="btn btn-primary btn-sm"
              disabled={!bulkTargetUser}
              style={{ height: 36, gap: '0.35rem' }}
            >
              <ArrowRightLeft size={14} strokeWidth={2} /> Transfer Leads
            </button>

            <button
              onClick={() => setSelectedLeads(new Set())}
              className="btn btn-ghost btn-sm"
              style={{ height: 36, fontSize: '0.75rem' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Leads Table / List ────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface-2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              type="checkbox"
              checked={leads.length > 0 && selectedLeads.size === leads.length}
              onChange={toggleSelectAll}
              style={{ width: 16, height: 16, accentColor: 'var(--color-primary)', cursor: 'pointer' }}
              title="Select all"
            />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Showing {leads.length} lead{leads.length !== 1 ? 's' : ''}
            </span>
          </div>

          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Tip: Use the dropdown on any row to instantly transfer that client
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3.5rem' }}>
            <span className="spinner" style={{ width: 30, height: 30 }} />
          </div>
        ) : leads.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CheckCircle size={36} strokeWidth={1.5} color="var(--color-success)" style={{ margin: '0 auto 0.75rem' }} />
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              {activeTab === 'my' ? 'No leads currently on your desk' : activeTab === 'unassigned' ? 'No unassigned leads waiting!' : 'No leads found'}
            </div>
            <div style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>
              {activeTab === 'my'
                ? 'Check the Unassigned pool to claim new leads or view All Team Leads.'
                : 'All incoming leads have been assigned to team members.'}
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="leads-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                  <th style={{ width: 40, padding: '0.75rem 0.5rem 0.75rem 1rem' }} />
                  <th style={{ padding: '0.75rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Client</th>
                  <th style={{ padding: '0.75rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Contact</th>
                  <th style={{ padding: '0.75rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Interest & Budget</th>
                  <th style={{ padding: '0.75rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Stage / Priority</th>
                  <th style={{ padding: '0.75rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Current Handler</th>
                  <th style={{ padding: '0.75rem 1rem 0.75rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', minWidth: 200 }}>
                    Assign / Hand Off
                  </th>
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => {
                  const isSelected = selectedLeads.has(lead.id);
                  const isNewAssignment = lead.stage === 'New / Unassigned';
                  const isAssignedToMe = lead.assigned_to === user?.id;

                  return (
                    <tr
                      key={lead.id}
                      style={{
                        borderBottom: '1px solid var(--color-border-light)',
                        background: isSelected ? 'var(--color-surface-2)' : 'transparent',
                        transition: 'background 120ms',
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '0.75rem 0.5rem 0.75rem 1rem' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectLead(lead.id)}
                          style={{ width: 16, height: 16, accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                        />
                      </td>

                      {/* Client Name & badges */}
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            onClick={() => navigate(`/leads/${lead.id}`)}
                            style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'none' }}
                          >
                            {lead.name}
                          </span>
                          {isNewAssignment && isAssignedToMe && (
                            <span style={{
                              background: 'rgba(239,68,68,0.15)',
                              color: 'var(--color-danger)',
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                            }}>
                              NEW
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          Source: {lead.source || 'Manual'} · {lead.assigned_at ? `Assigned ${formatRelative(lead.assigned_at)}` : 'Created ' + formatRelative(lead.created_at)}
                        </div>
                      </td>

                      {/* Contact & WhatsApp */}
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <a
                            href={`tel:${lead.phone}`}
                            style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-info)', textDecoration: 'none' }}
                          >
                            {formatPhone(lead.phone)}
                          </a>
                          <a
                            href={getWhatsAppUrl(lead.phone, lead.name, lead.project?.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost btn-icon"
                            style={{ width: 26, height: 26, color: '#25D366' }}
                            title="Chat on WhatsApp"
                          >
                            <WhatsAppIcon size={14} />
                          </a>
                        </div>
                        {lead.email && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                            {lead.email}
                          </div>
                        )}
                      </td>

                      {/* Interest & Budget */}
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                          {lead.project?.name || 'Any Project'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {lead.configuration ? `${lead.configuration} · ` : ''}
                          {lead.budget_max ? `Up to ${formatCurrency(lead.budget_max)}` : lead.budget_min ? `From ${formatCurrency(lead.budget_min)}` : 'Budget flexible'}
                        </div>
                      </td>

                      {/* Stage & Priority */}
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span
                            className="badge"
                            style={{
                              fontSize: '0.68rem',
                              background: `${STAGE_CONFIG[lead.stage]?.color || '#F59E0B'}22`,
                              color: STAGE_CONFIG[lead.stage]?.color || 'var(--text-secondary)',
                              borderColor: `${STAGE_CONFIG[lead.stage]?.color || '#F59E0B'}44`,
                            }}
                          >
                            {lead.stage}
                          </span>
                          <span className={`badge ${PRIORITY_CONFIG[lead.priority]?.class}`} style={{ fontSize: '0.65rem' }}>
                            {PRIORITY_CONFIG[lead.priority]?.label || lead.priority}
                          </span>
                        </div>
                      </td>

                      {/* Current Handler */}
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        {lead.assignee ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <div style={{
                              width: 26, height: 26, borderRadius: '50%',
                              background: lead.assignee.id === user?.id ? 'var(--color-primary)' : 'var(--color-surface-2)',
                              color: lead.assignee.id === user?.id ? '#080E1A' : 'var(--text-primary)',
                              fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {getInitials(lead.assignee.name)}
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                              {lead.assignee.name} {lead.assignee.id === user?.id && <span style={{ color: 'var(--color-primary)' }}>(You)</span>}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-warning)', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <UserX size={13} /> Unassigned
                          </span>
                        )}
                      </td>

                      {/* Fast Assign / Hand Off Dropdown */}
                      <td style={{ padding: '0.75rem 1rem 0.75rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {!lead.assigned_to && (
                            <button
                              onClick={() => handleClaimLead(lead.id, lead.name)}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.74rem', height: 32, padding: '0 0.5rem', whiteSpace: 'nowrap' }}
                            >
                              Claim Lead
                            </button>
                          )}
                          <select
                            className="form-select"
                            value={lead.assigned_to || ''}
                            onChange={e => handleReassign(lead.id, e.target.value, lead.name)}
                            disabled={reassigningId === lead.id}
                            style={{
                              fontSize: '0.75rem',
                              height: 32,
                              padding: '0 0.5rem',
                              minWidth: 150,
                              borderColor: isAssignedToMe ? 'var(--color-border)' : 'var(--color-border)',
                            }}
                          >
                            <option value="">{lead.assigned_to ? 'Transfer to...' : 'Assign to...'}</option>
                            {teamMembers.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.current_lead_count || 0} leads) {m.id === user?.id ? '★ You' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
