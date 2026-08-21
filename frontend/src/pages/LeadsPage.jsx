import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { leadsAPI, teamAPI, projectsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PIPELINE_STAGES, LEAD_SOURCES, CONFIGURATIONS, PURPOSES, LOST_REASONS, PRIORITY_CONFIG, STAGE_CONFIG } from '../utils/constants';
import { formatDate, formatPhone, formatCurrency, formatRelative, getInitials, downloadCSV, getWhatsAppUrl } from '../utils/helpers';
import {
  Download, Upload, SlidersHorizontal, Search, Pencil,
  Plus, Users, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown,
  Phone, MessageSquare, Flame, CheckCircle, Clock, ChevronRight, Building2,
} from 'lucide-react';
import LeadForm from '../components/leads/LeadForm';
import LeadFilters from '../components/leads/LeadFilters';
import CSVImportModal from '../components/common/CSVImportModal';
import Pagination from '../components/common/Pagination';
import toast from 'react-hot-toast';

export function WhatsAppIcon({ size = 15, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.979-.275-.1-.475-.15-.675.15-.2.3-.775.979-.95 1.179-.175.2-.35.225-.65.075-.301-.15-1.27-.468-2.42-1.493-.894-.798-1.498-1.784-1.673-2.084-.175-.3-.019-.462.132-.612.135-.135.301-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.675-1.625-.925-2.226-.244-.585-.492-.506-.675-.515-.175-.008-.375-.01-.575-.01-.2 0-.525.075-.8.375-.275.3-1.05 1.026-1.05 2.502 0 1.475 1.075 2.899 1.225 3.1 0.15.2 2.115 3.23 5.124 4.53 0.716.31 1.275.495 1.71.633.72.228 1.375.196 1.892.119.577-.087 1.78-.727 2.03-1.43.25-.703.25-1.306.175-1.43-.075-.124-.275-.2-.576-.35z" />
      <path d="M12.004 2c-5.523 0-10 4.477-10 10 0 1.764.457 3.42 1.258 4.862l-1.262 4.61 4.733-1.242c1.401.764 3.003 1.196 4.707 1.196 5.523 0 10-4.477 10-10s-4.477-10-10-10zm0 18.286c-1.54 0-2.983-.414-4.228-1.135l-.303-.178-2.809.737.75-2.738-.195-.311c-.787-1.256-1.215-2.716-1.215-4.237 0-4.424 3.576-8 8-8s8 3.576 8 8-3.576 8-8 8z" />
    </svg>
  );
}

export default function LeadsPage() {
  const { user, canViewAllLeads, canManageTeam } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [executives, setExecutives] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [showLeadForm, setShowLeadForm] = useState(searchParams.get('new') === 'true');
  const [editLead, setEditLead] = useState(null);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activePreset, setActivePreset] = useState('all');
  const [filters, setFilters] = useState({
    stage: '', source: '', priority: '', assigned_to: '',
    project_id: '', sla_breach: '', date_from: '', date_to: '',
  });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage, limit: 50,
        sort_by: sortBy, sort_dir: sortDir,
        search: searchTerm || undefined,
        ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)),
      };
      const { data } = await leadsAPI.list(params);
      setLeads(data.leads || []);
      setPagination(data.pagination || { total: 0, page: 1, pages: 1 });
    } catch (err) {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [currentPage, sortBy, sortDir, searchTerm, filters]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  useEffect(() => {
    if (canManageTeam) teamAPI.list().then(r => setExecutives(r.data?.filter(u => u.role === 'executive') || [])).catch(() => {});
    projectsAPI.list().then(r => setProjects(r.data || [])).catch(() => {});
  }, [canManageTeam]);

  const applyPreset = (presetKey) => {
    setActivePreset(presetKey);
    setCurrentPage(1);
    switch (presetKey) {
      case 'hot':
        setFilters({ stage: '', source: '', priority: 'hot', assigned_to: '', project_id: '', sla_breach: '', date_from: '', date_to: '' });
        break;
      case 'sla':
        setFilters({ stage: '', source: '', priority: '', assigned_to: '', project_id: '', sla_breach: 'true', date_from: '', date_to: '' });
        break;
      case 'new':
        setFilters({ stage: 'New / Unassigned', source: '', priority: '', assigned_to: '', project_id: '', sla_breach: '', date_from: '', date_to: '' });
        break;
      case 'site_visit':
        setFilters({ stage: 'Site Visit Scheduled', source: '', priority: '', assigned_to: '', project_id: '', sla_breach: '', date_from: '', date_to: '' });
        break;
      default:
        setFilters({ stage: '', source: '', priority: '', assigned_to: '', project_id: '', sla_breach: '', date_from: '', date_to: '' });
        break;
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this lead? This cannot be undone.')) return;
    try {
      await leadsAPI.delete(id);
      toast.success('Lead deleted');
      loadLeads();
    } catch (err) {
      toast.error('Failed to delete lead');
    }
  };

  const handleBulkReassign = async () => {
    const toUserId = prompt('Enter executive ID to reassign to:');
    if (!toUserId) return;
    try {
      await leadsAPI.bulk('reassign', [...selectedLeads], { to_user_id: toUserId });
      toast.success(`${selectedLeads.size} leads reassigned`);
      setSelectedLeads(new Set());
      loadLeads();
    } catch (err) {
      toast.error('Bulk reassign failed');
    }
  };

  const handleExport = () => {
    const data = leads.map(l => ({
      Name: l.name, Phone: l.phone, Email: l.email,
      Source: l.source, Stage: l.stage, Priority: l.priority,
      Project: l.project?.name, Assignee: l.assignee?.name,
      Budget: `${l.budget_min || ''} - ${l.budget_max || ''}`,
      Created: new Date(l.created_at).toLocaleDateString('en-IN'),
    }));
    downloadCSV(data, 'ghar-leads-export.csv');
    toast.success('Leads exported');
  };

  const toggleSelect = (id) => {
    setSelectedLeads(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map(l => l.id)));
    }
  };

  const handleSort = (col) => {
    if (sortBy === col) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortBy(col); setSortDir('desc'); }
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <ArrowUpDown size={12} style={{ opacity: 0.3, display: 'inline' }} />;
    return sortDir === 'asc'
      ? <ArrowUp size={12} style={{ color: 'var(--color-primary)', display: 'inline' }} />
      : <ArrowDown size={12} style={{ color: 'var(--color-primary)', display: 'inline' }} />;
  };

  // Quick stats counters
  const hotCount = leads.filter(l => l.priority === 'hot').length;
  const slaCount = leads.filter(l => l.sla_breach).length;
  const convertedCount = leads.filter(l => l.stage === 'Sold / Closed Won' || l.stage === 'Booking').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span className="live-pulse-dot" />
            <h1 className="page-title">Lead Central</h1>
          </div>
          <p className="page-subtitle">Manage intake, lead scores, assignment status, and stage conversions</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {canManageTeam && (
            <button onClick={() => setShowCSVImport(true)} className="btn btn-secondary btn-sm">
              <Download size={13} strokeWidth={2} /> Bulk Import
            </button>
          )}
          <button onClick={handleExport} className="btn btn-secondary btn-sm">
            <Upload size={13} strokeWidth={2} /> Export CSV
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary btn-sm"
            style={Object.values(filters).some(v => v) ? { borderColor: 'var(--color-primary)', color: 'var(--color-primary)' } : {}}
          >
            <SlidersHorizontal size={13} strokeWidth={2} />
            Filters
            {Object.values(filters).some(v => v) && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)', display: 'inline-block' }} />
            )}
          </button>
          <button onClick={() => { setEditLead(null); setShowLeadForm(true); }} className="btn btn-primary btn-sm">
            <Plus size={14} strokeWidth={2.5} /> Add Lead
          </button>
        </div>
      </div>

      {/* ── Quick Summary Stat Pills ────────────────────────────────────── */}
      <div className="leads-stat-grid" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem',
      }}>
        <div style={{ padding: '0.75rem 1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="icon-box icon-box-sm" style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent)' }}>
            <Users size={16} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{pagination.total}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Total Enquiries</div>
          </div>
        </div>

        <div style={{ padding: '0.75rem 1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="icon-box icon-box-sm" style={{ background: 'rgba(239,68,68,0.14)', color: 'var(--color-danger)' }}>
            <Flame size={16} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-danger)', lineHeight: 1 }}>{hotCount}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Hot Priority</div>
          </div>
        </div>

        <div style={{ padding: '0.75rem 1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="icon-box icon-box-sm" style={{ background: 'rgba(245,158,11,0.14)', color: 'var(--color-warning)' }}>
            <AlertTriangle size={16} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-warning)', lineHeight: 1 }}>{slaCount}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>SLA Alerts</div>
          </div>
        </div>

        <div style={{ padding: '0.75rem 1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="icon-box icon-box-sm" style={{ background: 'var(--color-success-dim)', color: 'var(--color-success)' }}>
            <CheckCircle size={16} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-success)', lineHeight: 1 }}>{convertedCount}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Booked / Won</div>
          </div>
        </div>
      </div>

      {/* ── Search & Preset Filter Pills ────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div className="leads-search-row" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 260, maxWidth: 440 }}>
            <Search size={15} strokeWidth={1.75} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              placeholder="Search by name, phone (+91), or email..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          {/* Quick preset filters with professional vector icons */}
          <div className="filter-presets-scroll" style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.2rem', WebkitOverflowScrolling: 'touch' }}>
            {[
              { key: 'all', label: 'All Leads', icon: Users },
              { key: 'hot', label: 'Hot', icon: Flame, color: 'var(--color-danger)' },
              { key: 'sla', label: 'SLA Breach', icon: AlertTriangle, color: 'var(--color-warning)' },
              { key: 'new', label: 'New / Fresh', icon: Plus, color: 'var(--color-info)' },
              { key: 'site_visit', label: 'Site Visits', icon: Building2, color: 'var(--color-primary)' },
            ].map(preset => {
              const Icon = preset.icon;
              const isActive = activePreset === preset.key;
              return (
                <button
                  key={preset.key}
                  onClick={() => applyPreset(preset.key)}
                  className={`quick-action-pill ${isActive ? 'btn-primary' : ''}`}
                  style={isActive ? { background: 'var(--color-primary)', color: 'var(--text-inverse)', borderColor: 'var(--color-primary)' } : {}}
                >
                  <Icon size={12} strokeWidth={2.25} color={isActive ? 'currentColor' : preset.color || 'currentColor'} />
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>

          {selectedLeads.size > 0 && canManageTeam && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedLeads.size} selected</span>
              <button onClick={handleBulkReassign} className="btn btn-secondary btn-sm">Reassign</button>
              <button onClick={() => setSelectedLeads(new Set())} className="btn btn-ghost btn-sm">Clear</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Advanced Filters Drawer ─────────────────────────────────────── */}
      {showFilters && (
        <LeadFilters
          filters={filters}
          onChange={(k, v) => { setFilters(f => ({ ...f, [k]: v })); setActivePreset('custom'); setCurrentPage(1); }}
          onReset={() => { setFilters({ stage:'', source:'', priority:'', assigned_to:'', project_id:'', sla_breach:'', date_from:'', date_to:'' }); setActivePreset('all'); }}
          executives={executives}
          projects={projects}
          canFilterByExec={canViewAllLeads}
        />
      )}

      {/* ── Rich Leads Table ────────────────────────────────────────────── */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {canManageTeam && (
                <th style={{ width: 40 }}>
                  <input type="checkbox" onChange={selectAll} checked={selectedLeads.size === leads.length && leads.length > 0} />
                </th>
              )}
              <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                Lead Details <SortIcon col="name" />
              </th>
              <th>Contact Info</th>
              <th onClick={() => handleSort('stage')} style={{ cursor: 'pointer' }}>
                Stage <SortIcon col="stage" />
              </th>
              <th onClick={() => handleSort('priority')} style={{ cursor: 'pointer' }}>
                Intent & Score <SortIcon col="priority" />
              </th>
              <th>Budget & Config</th>
              {canViewAllLeads && <th>Assigned Executive</th>}
              <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>
                Added <SortIcon col="created_at" />
              </th>
              <th style={{ width: 100, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '4rem' }}>
                <span className="spinner" style={{ width: 28, height: 28 }} />
              </td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={10}>
                <div className="empty-state">
                  <div className="empty-state-icon"><Users size={24} strokeWidth={1.5} /></div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '1rem' }}>No leads matching your criteria</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {searchTerm || Object.values(filters).some(v => v) ? 'Try adjusting your search terms or filters' : 'Add your first lead to start building your sales pipeline'}
                    </p>
                  </div>
                  <button onClick={() => setShowLeadForm(true)} className="btn btn-primary btn-sm">
                    <Plus size={14} strokeWidth={2.5} /> Add First Lead
                  </button>
                </div>
              </td></tr>
            ) : (
              leads.map(lead => {
                const scoreClass = (lead.lead_score || 0) >= 70 ? 'high' : (lead.lead_score || 0) >= 40 ? 'medium' : 'low';
                return (
                  <tr
                    key={lead.id}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    style={{ cursor: 'pointer', transition: 'background 120ms' }}
                  >
                    {canManageTeam && (
                      <td onClick={e => { e.stopPropagation(); toggleSelect(lead.id); }}>
                        <input type="checkbox" checked={selectedLeads.has(lead.id)} onChange={() => {}} />
                      </td>
                    )}
                    <td data-label="Lead">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #4F6FE8, #7C3AED)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', fontWeight: 800, color: 'white',
                          flexShrink: 0, boxShadow: '0 2px 8px rgba(79,111,232,0.25)',
                        }}>
                          {getInitials(lead.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            {lead.name}
                            {lead.is_duplicate && <span className="badge badge-danger" style={{ fontSize: '0.58rem' }}>DUP</span>}
                            {lead.sla_breach && (
                              <span className="badge badge-danger" style={{ fontSize: '0.58rem', display: 'inline-flex', alignItems: 'center', gap: '2px' }} title="SLA Breach">
                                <AlertTriangle size={10} strokeWidth={2} /> SLA
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {lead.source}{lead.sub_source ? ` · ${lead.sub_source}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td data-label="Contact">
                      <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} style={{ color: 'var(--color-info)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }} title="Call Lead">
                          <Phone size={12} strokeWidth={1.75} />
                          {formatPhone(lead.phone)}
                        </a>
                        {lead.email && <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{lead.email}</div>}
                      </div>
                    </td>
                    <td data-label="Stage">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <div className={`stage-dot ${STAGE_CONFIG[lead.stage]?.class}`} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: STAGE_CONFIG[lead.stage]?.color || 'var(--text-secondary)' }}>
                          {STAGE_CONFIG[lead.stage]?.short || lead.stage}
                        </span>
                      </div>
                    </td>
                    <td data-label="Priority">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span className={`badge ${PRIORITY_CONFIG[lead.priority]?.class}`}>
                          {PRIORITY_CONFIG[lead.priority]?.label}
                        </span>
                        <span className={`score-badge ${scoreClass}`}>
                          {lead.lead_score || 0}/100
                        </span>
                      </div>
                    </td>
                    <td data-label="Budget">
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {lead.budget_max ? formatCurrency(lead.budget_max) : lead.budget_min ? formatCurrency(lead.budget_min) : '—'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {lead.configuration || 'Any Config'} {lead.project?.name ? `· ${lead.project.name}` : ''}
                      </div>
                    </td>
                    {canViewAllLeads && (
                      <td data-label="Assignee" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {lead.assignee ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <div style={{
                              width: 22, height: 22, borderRadius: '50%',
                              background: 'var(--color-accent)', display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.6rem', fontWeight: 700, color: 'white',
                            }}>
                              {getInitials(lead.assignee.name)}
                            </div>
                            <span style={{ fontWeight: 500 }}>{lead.assignee.name}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-warning)', fontSize: '0.75rem', fontWeight: 600 }}>Unassigned</span>
                        )}
                      </td>
                    )}
                    <td data-label="Added" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <div>{formatDate(lead.created_at)}</div>
                      <div style={{ fontSize: '0.68rem' }}>{formatRelative(lead.last_activity_at)}</div>
                    </td>
                    <td onClick={e => e.stopPropagation()} style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <a
                          href={getWhatsAppUrl(lead.phone, lead.name, lead.project?.name)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-ghost btn-sm btn-icon"
                          title={`Chat directly with ${lead.name} on WhatsApp`}
                          style={{
                            color: '#25D366',
                            background: 'rgba(37, 211, 102, 0.1)',
                            border: '1px solid rgba(37, 211, 102, 0.3)',
                            borderRadius: 'var(--radius-full)',
                            width: 28,
                            height: 28,
                            padding: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <WhatsAppIcon size={14} />
                        </a>
                        <button
                          onClick={() => { setEditLead(lead); setShowLeadForm(true); }}
                          className="btn btn-ghost btn-sm btn-icon"
                          title="Edit Lead"
                          style={{ width: 28, height: 28, padding: 0 }}
                        >
                          <Pencil size={13} strokeWidth={1.75} />
                        </button>
                        <button
                          onClick={() => navigate(`/leads/${lead.id}`)}
                          className="btn btn-ghost btn-sm btn-icon"
                          title="View Details"
                          style={{ width: 28, height: 28, padding: 0 }}
                        >
                          <ChevronRight size={14} strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        current={currentPage}
        total={pagination.pages}
        onChange={setCurrentPage}
        count={pagination.total}
      />

      {/* Lead Form Modal */}
      {showLeadForm && (
        <LeadForm
          lead={editLead}
          projects={projects}
          executives={executives}
          canAssign={canManageTeam}
          onClose={() => { setShowLeadForm(false); setEditLead(null); }}
          onSave={() => { setShowLeadForm(false); setEditLead(null); loadLeads(); }}
        />
      )}

      {/* CSV Import Modal */}
      {showCSVImport && (
        <CSVImportModal
          onClose={() => setShowCSVImport(false)}
          onImported={() => { setShowCSVImport(false); loadLeads(); }}
        />
      )}
    </div>
  );
}
