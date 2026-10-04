import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck, Users, AlertCircle, ArrowRightLeft, Search,
  Phone, MessageSquare, CheckCircle, Clock, Flame,
  UserPlus, SlidersHorizontal, CheckCheck, RefreshCw,
  ExternalLink, UserX, LayoutGrid, Table as TableIcon,
  ChevronRight,
} from 'lucide-react';
import { leadsAPI, teamAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  formatPhone, formatCurrency, formatRelative, formatDate,
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
  // Interactive Team Load Balancer selected member ('all' or specific user UUID)
  const [selectedMemberId, setSelectedMemberId] = useState('all');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [bulkTargetUser, setBulkTargetUser] = useState('');
  const [subFilter, setSubFilter] = useState('all'); // 'all', 'new', 'hot'
  const [reassigningId, setReassigningId] = useState(null);
  // View mode for mobile screens: 'cards' or 'table'
  const [viewMode, setViewMode] = useState('cards');

  // Load team members for assignment dropdowns & balancer track
  const loadTeam = useCallback(async () => {
    try {
      const { data } = await teamAPI.list();
      setTeamMembers((data || []).filter(u => u.status === 'active'));
    } catch {}
  }, []);

  // Load leads based on current tab, balancer member filter, and search
  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100, sort_by: 'assigned_at', sort_dir: 'desc' };

      // If a specific team member is selected in Team Load Balancer, filter by their ID
      if (selectedMemberId && selectedMemberId !== 'all') {
        params.assigned_to = selectedMemberId;
      } else if (activeTab === 'my') {
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
  }, [activeTab, selectedMemberId, searchTerm, subFilter]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // Handle Team Load Balancer member click
  const handleSelectMember = (memberId) => {
    if (selectedMemberId === memberId) {
      // Toggle off to show all
      setSelectedMemberId('all');
    } else {
      setSelectedMemberId(memberId);
      setActiveTab('all');
    }
  };

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

  const selectedMemberObj = teamMembers.find(m => m.id === selectedMemberId);
  const totalAssignedInView = teamMembers.reduce((sum, m) => sum + (m.current_lead_count || 0), 0);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      width: '100%',
      maxWidth: '100%',
      minWidth: 0,
      boxSizing: 'border-box',
      overflowX: 'hidden',
    }}>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="page-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '0.75rem',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
            <div style={{
              width: 34, height: 34, borderRadius: '8px',
              background: 'linear-gradient(135deg, #E8A020, #F59E0B)',
              color: '#080E1A', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <UserCheck size={18} strokeWidth={2.5} />
            </div>
            <h1 className="page-title" style={{ margin: 0, fontSize: '1.25rem', whiteSpace: 'nowrap' }}>Lead Assignment Hub</h1>
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
                whiteSpace: 'nowrap',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-danger)', animation: 'pulse 1.5s infinite' }} />
                {assignedStats.unreadAssignmentNotifs || assignedStats.newAssignedCount} New
              </span>
            )}
          </div>
          <p className="page-subtitle" style={{ margin: 0, fontSize: '0.8rem' }}>
            Distribute, transfer, and balance client workload across team members in real-time
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
          {assignedStats.hasPendingAlert && (
            <button
              onClick={handleAcknowledgeAssignments}
              className="btn btn-secondary btn-sm"
              title="Clear notification alert"
              style={{ fontSize: '0.76rem', padding: '0.35rem 0.65rem' }}
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

      {/* ── Summary Cards (Responsive 2x2 grid on mobile) ────────────────── */}
      <div className="leads-stat-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.65rem',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        {/* Assigned to Me */}
        <div
          onClick={() => { setSelectedMemberId('all'); setActiveTab('my'); setSubFilter('all'); }}
          style={{
            padding: '0.875rem',
            background: 'var(--color-surface)',
            border: `1.5px solid ${activeTab === 'my' && selectedMemberId === 'all' && subFilter === 'all' ? 'var(--color-primary)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-lg)',
            cursor: 'pointer',
            transition: 'all 150ms ease',
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Assigned to Me</span>
            <div className="icon-box icon-box-sm" style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent)' }}>
              <UserCheck size={15} strokeWidth={2.2} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.3rem', lineHeight: 1 }}>
            {assignedStats.assignedToMeCount}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Clients on your desk
          </div>
        </div>

        {/* New / Uncontacted Assigned to Me */}
        <div
          onClick={() => { setSelectedMemberId('all'); setActiveTab('my'); setSubFilter('new'); }}
          style={{
            padding: '0.875rem',
            background: 'var(--color-surface)',
            border: `1.5px solid ${subFilter === 'new' && selectedMemberId === 'all' ? 'var(--color-danger)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-lg)',
            cursor: 'pointer',
            transition: 'all 150ms ease',
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>New / Uncontacted</span>
            <div className="icon-box icon-box-sm" style={{ background: 'rgba(239,68,68,0.14)', color: 'var(--color-danger)' }}>
              <AlertCircle size={15} strokeWidth={2.2} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-danger)', marginTop: '0.3rem', lineHeight: 1 }}>
            {assignedStats.newAssignedCount}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Awaiting first outreach
          </div>
        </div>

        {/* Unassigned Pool */}
        <div
          onClick={() => { setSelectedMemberId('all'); setActiveTab('unassigned'); setSubFilter('all'); }}
          style={{
            padding: '0.875rem',
            background: 'var(--color-surface)',
            border: `1.5px solid ${activeTab === 'unassigned' ? 'var(--color-warning)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-lg)',
            cursor: 'pointer',
            transition: 'all 150ms ease',
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Unassigned Pool</span>
            <div className="icon-box icon-box-sm" style={{ background: 'rgba(245,158,11,0.14)', color: 'var(--color-warning)' }}>
              <UserX size={15} strokeWidth={2.2} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-warning)', marginTop: '0.3rem', lineHeight: 1 }}>
            {assignedStats.unassignedCount}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Available to claim
          </div>
        </div>

        {/* Team Workload */}
        <div
          onClick={() => { setSelectedMemberId('all'); setActiveTab('all'); setSubFilter('all'); }}
          style={{
            padding: '0.875rem',
            background: 'var(--color-surface)',
            border: `1.5px solid ${activeTab === 'all' && selectedMemberId === 'all' ? 'var(--color-info)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-lg)',
            cursor: 'pointer',
            transition: 'all 150ms ease',
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Team Load</span>
            <div className="icon-box icon-box-sm" style={{ background: 'rgba(59,130,246,0.14)', color: 'var(--color-info)' }}>
              <Users size={15} strokeWidth={2.2} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-info)', marginTop: '0.3rem', lineHeight: 1 }}>
            {totalAssignedInView}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Across {teamMembers.length} active members
          </div>
        </div>
      </div>

      {/* ── Interactive Team Load Balancer (Finger-swipeable track) ────────── */}
      <div className="card" style={{ padding: '0.875rem 1rem', width: '100%', boxSizing: 'border-box' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem',
          flexWrap: 'wrap',
          gap: '0.4rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <ArrowRightLeft size={14} color="var(--color-primary)" />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Team Load Balancer
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            👉 Click any user to inspect their leads &amp; re-balance workload
          </span>
        </div>

        {/* Swipeable member pills container */}
        <div className="horizontal-swipe-track" style={{ gap: '0.5rem' }}>
          {/* All Team Members button */}
          <button
            type="button"
            onClick={() => setSelectedMemberId('all')}
            className={`balancer-member-pill ${selectedMemberId === 'all' ? 'active' : ''}`}
          >
            <Users size={14} strokeWidth={2} />
            <span>All Members</span>
            <span className="badge-count">{totalAssignedInView}</span>
          </button>

          {/* Each individual Team Member button */}
          {teamMembers.map(member => {
            const isSelected = selectedMemberId === member.id;
            const isMe = member.id === user?.id;
            return (
              <button
                type="button"
                key={member.id}
                onClick={() => handleSelectMember(member.id)}
                className={`balancer-member-pill ${isSelected ? 'active' : ''}`}
                title={`Click to filter leads assigned to ${member.name}`}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: isSelected ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: isSelected ? '#080E1A' : 'var(--text-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.62rem', fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {getInitials(member.name)}
                </div>
                <span>{member.name} {isMe && '(You)'}</span>
                <span className="badge-count">
                  {member.current_lead_count || 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Member Selection Banner */}
        {selectedMemberId !== 'all' && selectedMemberObj && (
          <div style={{
            marginTop: '0.65rem',
            padding: '0.45rem 0.75rem',
            background: 'var(--color-primary-dim)',
            border: '1px solid rgba(232,160,32,0.3)',
            borderRadius: 'var(--radius)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
            fontSize: '0.78rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                Viewing leads assigned to: {selectedMemberObj.name}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                ({leads.length} lead{leads.length !== 1 ? 's' : ''} listed)
              </span>
            </div>
            <button
              onClick={() => setSelectedMemberId('all')}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.72rem', height: 24, padding: '0 0.5rem' }}
            >
              Reset / View All
            </button>
          </div>
        )}
      </div>

      {/* ── Main Tab Navigation & Filter Controls ────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', width: '100%', boxSizing: 'border-box' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.65rem',
          width: '100%',
        }}>
          {/* Main Tabs (Finger-swipeable track on mobile) */}
          <div className="horizontal-swipe-track" style={{
            background: 'var(--color-surface)',
            padding: '0.25rem',
            borderRadius: '10px',
            border: '1px solid var(--color-border)',
            gap: '0.25rem',
            flex: '1 1 auto',
            minWidth: 0,
          }}>
            <button
              onClick={() => { setSelectedMemberId('all'); setActiveTab('my'); setSubFilter('all'); }}
              className={`btn btn-sm ${activeTab === 'my' && selectedMemberId === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              Assigned to Me ({assignedStats.assignedToMeCount})
            </button>
            <button
              onClick={() => { setSelectedMemberId('all'); setActiveTab('all'); setSubFilter('all'); }}
              className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              All Team Leads ({totalAssignedInView})
            </button>
            <button
              onClick={() => { setSelectedMemberId('all'); setActiveTab('unassigned'); setSubFilter('all'); }}
              className={`btn btn-sm ${activeTab === 'unassigned' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              Unassigned ({assignedStats.unassignedCount})
            </button>
          </div>

          {/* Search Box & View Mode Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', width: 'auto' }}>
            <div style={{ position: 'relative', width: '200px', maxWidth: '100%' }}>
              <Search size={14} strokeWidth={1.75} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2rem', fontSize: '0.78rem', height: 34 }}
              />
            </div>

            {/* View Mode Toggle: Cards vs Table */}
            <div style={{ display: 'flex', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '0.15rem' }}>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`btn btn-sm btn-icon ${viewMode === 'cards' ? 'btn-primary' : 'btn-ghost'}`}
                title="Mobile Cards View"
                style={{ width: 30, height: 30, padding: 0 }}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`btn btn-sm btn-icon ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
                title="Swipeable Table View"
                style={{ width: 30, height: 30, padding: 0 }}
              >
                <TableIcon size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Sub-filters for active tab */}
        {activeTab === 'my' && selectedMemberId === 'all' && (
          <div className="horizontal-swipe-track" style={{ gap: '0.35rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>Filter:</span>
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
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.55rem',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
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
          position: 'sticky', top: 'calc(var(--topbar-height) + 6px)', zIndex: 50,
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-primary)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.65rem 1rem',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          animation: 'slideDown 150ms ease',
          width: '100%',
          boxSizing: 'border-box',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              background: 'var(--color-primary)',
              color: '#080E1A',
              fontWeight: 800,
              fontSize: '0.72rem',
              padding: '0.15rem 0.45rem',
              borderRadius: '999px',
            }}>
              {selectedLeads.size} selected
            </span>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Bulk Reassign / Hand Off to teammate:
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <select
              className="form-select"
              value={bulkTargetUser}
              onChange={e => setBulkTargetUser(e.target.value)}
              style={{ fontSize: '0.78rem', height: 32, minWidth: 160 }}
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
              style={{ height: 32, gap: '0.35rem', fontSize: '0.78rem' }}
            >
              <ArrowRightLeft size={13} strokeWidth={2} /> Transfer
            </button>

            <button
              onClick={() => setSelectedLeads(new Set())}
              className="btn btn-ghost btn-sm"
              style={{ height: 32, fontSize: '0.74rem' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Content View: Cards vs Table ─────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', width: '100%', boxSizing: 'border-box' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.65rem 0.875rem', borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface-2)',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <input
              type="checkbox"
              checked={leads.length > 0 && selectedLeads.size === leads.length}
              onChange={toggleSelectAll}
              style={{ width: 16, height: 16, accentColor: 'var(--color-primary)', cursor: 'pointer' }}
              title="Select all leads"
            />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {leads.length} lead{leads.length !== 1 ? 's' : ''} listed
            </span>
          </div>

          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Use the dropdown on any item to instantly reassign
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
              {selectedMemberId !== 'all'
                ? `No leads found assigned to ${selectedMemberObj?.name}`
                : activeTab === 'my'
                  ? 'No leads currently on your desk'
                  : activeTab === 'unassigned'
                    ? 'No unassigned leads waiting!'
                    : 'No leads found'}
            </div>
            <div style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>
              {activeTab === 'my' && selectedMemberId === 'all'
                ? 'Check the Unassigned pool to claim new leads or view All Team Leads.'
                : 'All leads have been properly assigned and managed.'}
            </div>
          </div>
        ) : viewMode === 'cards' ? (
          /* ── Mobile Responsive Card View (Zero Cutoff) ─────────────────── */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            padding: '0.75rem',
            width: '100%',
            boxSizing: 'border-box',
          }}>
            {leads.map(lead => {
              const isSelected = selectedLeads.has(lead.id);
              const isNewAssignment = lead.stage === 'New / Unassigned';
              const isAssignedToMe = lead.assigned_to === user?.id;

              return (
                <div
                  key={lead.id}
                  style={{
                    background: isSelected ? 'var(--color-surface-2)' : 'var(--color-surface)',
                    border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius)',
                    padding: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    transition: 'border-color 140ms ease',
                    boxSizing: 'border-box',
                    width: '100%',
                  }}
                >
                  {/* Card Row 1: Checkbox + Name + Badges */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectLead(lead.id)}
                        style={{ width: 16, height: 16, accentColor: 'var(--color-primary)', cursor: 'pointer', flexShrink: 0 }}
                      />
                      <span
                        onClick={() => navigate(`/leads/${lead.id}`)}
                        style={{
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          color: 'var(--color-primary)',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {lead.name}
                      </span>
                      {isNewAssignment && isAssignedToMe && (
                        <span style={{
                          background: 'rgba(239,68,68,0.15)',
                          color: 'var(--color-danger)',
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          padding: '0.1rem 0.35rem',
                          borderRadius: '4px',
                          flexShrink: 0,
                        }}>
                          NEW
                        </span>
                      )}
                    </div>

                    {/* Stage badge */}
                    <span
                      className="badge"
                      style={{
                        fontSize: '0.65rem',
                        background: `${STAGE_CONFIG[lead.stage]?.color || '#F59E0B'}22`,
                        color: STAGE_CONFIG[lead.stage]?.color || 'var(--text-secondary)',
                        borderColor: `${STAGE_CONFIG[lead.stage]?.color || '#F59E0B'}44`,
                        flexShrink: 0,
                      }}
                    >
                      {STAGE_CONFIG[lead.stage]?.short || lead.stage}
                    </span>
                  </div>

                  {/* Card Row 2: Phone + WhatsApp + Budget */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <a
                        href={`tel:${lead.phone}`}
                        style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-info)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <Phone size={12} strokeWidth={1.75} />{formatPhone(lead.phone)}
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

                    <div style={{ fontSize: '0.74rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {lead.project?.name ? `${lead.project.name} · ` : ''}
                      {lead.budget_max ? formatCurrency(lead.budget_max) : lead.budget_min ? formatCurrency(lead.budget_min) : 'Flexible'}
                    </div>
                  </div>

                  {/* Card Row 3: Current Assignee & 1-Click Reassign */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '0.25rem',
                    paddingTop: '0.45rem',
                    borderTop: '1px solid var(--color-border-light)',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Assigned:</span>
                      {lead.assignee ? (
                        <span style={{ fontWeight: 600, color: lead.assignee.id === user?.id ? 'var(--color-primary)' : 'var(--text-primary)' }}>
                          {lead.assignee.name} {lead.assignee.id === user?.id && '(You)'}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>Unassigned</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {!lead.assigned_to && (
                        <button
                          type="button"
                          onClick={() => handleClaimLead(lead.id, lead.name)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.72rem', height: 28, padding: '0 0.5rem' }}
                        >
                          Claim
                        </button>
                      )}
                      <select
                        className="form-select"
                        value={lead.assigned_to || ''}
                        onChange={e => handleReassign(lead.id, e.target.value, lead.name)}
                        disabled={reassigningId === lead.id}
                        style={{
                          fontSize: '0.72rem',
                          height: 28,
                          padding: '0 0.4rem',
                          maxWidth: 160,
                        }}
                      >
                        <option value="">{lead.assigned_to ? 'Transfer to...' : 'Assign to...'}</option>
                        {teamMembers.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.current_lead_count || 0}) {m.id === user?.id ? '★ You' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Swipeable Full Table (Finger Sliding with zero cutoff) ─────── */
          <div className="table-scroll-container">
            {/* Visual swipe helper for touch screens */}
            <div className="mobile-swipe-hint">
              <span>👈 Slide right-to-left with your finger to view all columns &amp; reassign 👉</span>
            </div>

            <table className="leads-table" style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                  <th style={{ width: 40, padding: '0.75rem 0.5rem 0.75rem 1rem' }} />
                  <th style={{ padding: '0.75rem 0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Client</th>
                  <th style={{ padding: '0.75rem 0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Contact</th>
                  <th style={{ padding: '0.75rem 0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Interest &amp; Budget</th>
                  <th style={{ padding: '0.75rem 0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Stage / Priority</th>
                  <th style={{ padding: '0.75rem 0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Current Handler</th>
                  <th style={{ padding: '0.75rem 1rem 0.75rem 0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', minWidth: 190 }}>
                    Transfer / Assign
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
                            style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-primary)', cursor: 'pointer' }}
                          >
                            {lead.name}
                          </span>
                          {isNewAssignment && isAssignedToMe && (
                            <span style={{
                              background: 'rgba(239,68,68,0.15)',
                              color: 'var(--color-danger)',
                              fontSize: '0.6rem',
                              fontWeight: 700,
                              padding: '0.1rem 0.35rem',
                              borderRadius: '4px',
                            }}>
                              NEW
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {lead.assigned_at ? `Assigned ${formatRelative(lead.assigned_at)}` : 'Created ' + formatRelative(lead.created_at)}
                        </div>
                      </td>

                      {/* Contact & WhatsApp */}
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <a
                            href={`tel:${lead.phone}`}
                            style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-info)', textDecoration: 'none' }}
                          >
                            {formatPhone(lead.phone)}
                          </a>
                          <a
                            href={getWhatsAppUrl(lead.phone, lead.name, lead.project?.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost btn-icon"
                            style={{ width: 24, height: 24, color: '#25D366' }}
                            title="Chat on WhatsApp"
                          >
                            <WhatsAppIcon size={13} />
                          </a>
                        </div>
                        {lead.email && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }}>
                            {lead.email}
                          </div>
                        )}
                      </td>

                      {/* Interest & Budget */}
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                          {lead.project?.name || 'Any Project'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          {lead.configuration ? `${lead.configuration} · ` : ''}
                          {lead.budget_max ? formatCurrency(lead.budget_max) : lead.budget_min ? formatCurrency(lead.budget_min) : 'Flexible'}
                        </div>
                      </td>

                      {/* Stage & Priority */}
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <span
                            className="badge"
                            style={{
                              fontSize: '0.65rem',
                              background: `${STAGE_CONFIG[lead.stage]?.color || '#F59E0B'}22`,
                              color: STAGE_CONFIG[lead.stage]?.color || 'var(--text-secondary)',
                              borderColor: `${STAGE_CONFIG[lead.stage]?.color || '#F59E0B'}44`,
                            }}
                          >
                            {STAGE_CONFIG[lead.stage]?.short || lead.stage}
                          </span>
                          <span className={`badge ${PRIORITY_CONFIG[lead.priority]?.class}`} style={{ fontSize: '0.62rem' }}>
                            {PRIORITY_CONFIG[lead.priority]?.label || lead.priority}
                          </span>
                        </div>
                      </td>

                      {/* Current Handler */}
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        {lead.assignee ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <div style={{
                              width: 24, height: 24, borderRadius: '50%',
                              background: lead.assignee.id === user?.id ? 'var(--color-primary)' : 'var(--color-surface-2)',
                              color: lead.assignee.id === user?.id ? '#080E1A' : 'var(--text-primary)',
                              fontSize: '0.62rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {getInitials(lead.assignee.name)}
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                              {lead.assignee.name} {lead.assignee.id === user?.id && <span style={{ color: 'var(--color-primary)' }}>(You)</span>}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-warning)', fontSize: '0.72rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <UserX size={12} /> Unassigned
                          </span>
                        )}
                      </td>

                      {/* Fast Assign / Hand Off Dropdown */}
                      <td style={{ padding: '0.75rem 1rem 0.75rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {!lead.assigned_to && (
                            <button
                              onClick={() => handleClaimLead(lead.id, lead.name)}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.72rem', height: 30, padding: '0 0.45rem', whiteSpace: 'nowrap' }}
                            >
                              Claim
                            </button>
                          )}
                          <select
                            className="form-select"
                            value={lead.assigned_to || ''}
                            onChange={e => handleReassign(lead.id, e.target.value, lead.name)}
                            disabled={reassigningId === lead.id}
                            style={{
                              fontSize: '0.74rem',
                              height: 30,
                              padding: '0 0.45rem',
                              minWidth: 145,
                            }}
                          >
                            <option value="">{lead.assigned_to ? 'Transfer to...' : 'Assign to...'}</option>
                            {teamMembers.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.current_lead_count || 0}) {m.id === user?.id ? '★ You' : ''}
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
