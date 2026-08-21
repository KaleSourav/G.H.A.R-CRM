import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { leadsAPI, teamAPI, projectsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PIPELINE_STAGES, LEAD_SOURCES, CONFIGURATIONS, PURPOSES, LOST_REASONS, PRIORITY_CONFIG, STAGE_CONFIG } from '../utils/constants';
import { formatDate, formatPhone, formatCurrency, formatRelative, getInitials, downloadCSV } from '../utils/helpers';
import {
  Download, Upload, SlidersHorizontal, Search, Pencil,
  Plus, Users, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import LeadForm from '../components/leads/LeadForm';
import LeadFilters from '../components/leads/LeadFilters';
import CSVImportModal from '../components/common/CSVImportModal';
import Pagination from '../components/common/Pagination';
import toast from 'react-hot-toast';

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-subtitle">{pagination.total.toLocaleString()} total leads</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {canManageTeam && (
            <button onClick={() => setShowCSVImport(true)} className="btn btn-secondary btn-sm">
              <Download size={13} strokeWidth={2} /> Import
            </button>
          )}
          <button onClick={handleExport} className="btn btn-secondary btn-sm">
            <Upload size={13} strokeWidth={2} /> Export
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
            <Plus size={13} strokeWidth={2.5} /> Add Lead
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <Search size={15} strokeWidth={1.75} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="form-input"
            placeholder="Search by name, phone, or email..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>
        {selectedLeads.size > 0 && canManageTeam && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedLeads.size} selected</span>
            <button onClick={handleBulkReassign} className="btn btn-secondary btn-sm">Reassign</button>
            <button onClick={() => setSelectedLeads(new Set())} className="btn btn-ghost btn-sm">Clear</button>
          </div>
        )}
      </div>

      {/* Filters panel */}
      {showFilters && (
        <LeadFilters
          filters={filters}
          onChange={(k, v) => { setFilters(f => ({ ...f, [k]: v })); setCurrentPage(1); }}
          onReset={() => setFilters({ stage:'', source:'', priority:'', assigned_to:'', project_id:'', sla_breach:'', date_from:'', date_to:'' })}
          executives={executives}
          projects={projects}
          canFilterByExec={canViewAllLeads}
        />
      )}

      {/* Table */}
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
                Lead <SortIcon col="name" />
              </th>
              <th>Contact</th>
              <th onClick={() => handleSort('stage')} style={{ cursor: 'pointer' }}>
                Stage <SortIcon col="stage" />
              </th>
              <th onClick={() => handleSort('priority')} style={{ cursor: 'pointer' }}>
                Priority <SortIcon col="priority" />
              </th>
              <th>Project</th>
              {canViewAllLeads && <th>Assigned To</th>}
              <th onClick={() => handleSort('last_activity_at')} style={{ cursor: 'pointer' }}>
                Last Activity <SortIcon col="last_activity_at" />
              </th>
              <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>
                Created <SortIcon col="created_at" />
              </th>
              <th style={{ width: 80 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '3rem' }}>
                <span className="spinner" style={{ width: 24, height: 24 }} />
              </td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={10}>
                <div className="empty-state">
                  <div className="empty-state-icon"><Users size={22} strokeWidth={1.5} /></div>
                  <div>
                    <p style={{ fontWeight: 600 }}>No leads found</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {searchTerm || Object.values(filters).some(v => v) ? 'Try adjusting your filters' : 'Add your first lead to get started'}
                    </p>
                  </div>
                  <button onClick={() => setShowLeadForm(true)} className="btn btn-primary btn-sm">+ Add Lead</button>
                </div>
              </td></tr>
            ) : (
              leads.map(lead => (
                <tr
                  key={lead.id}
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  style={{ cursor: 'pointer' }}
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
                        background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 700, color: 'white',
                        flexShrink: 0,
                      }}>
                        {getInitials(lead.name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                          {lead.name}
                          {lead.is_duplicate && <span className="badge badge-danger" style={{ marginLeft: '0.5rem', fontSize: '0.6rem' }}>DUP</span>}
                          {lead.sla_breach && <AlertTriangle size={12} strokeWidth={2} color="var(--color-danger)" style={{ marginLeft: '0.4rem', display: 'inline', verticalAlign: 'middle' }} title="SLA Breach" />}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lead.source}</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Contact">
                    <div style={{ fontSize: '0.8rem' }}>
                      <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} style={{ color: 'var(--color-info)' }}>
                        {formatPhone(lead.phone)}
                      </a>
                      {lead.email && <div style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{lead.email}</div>}
                    </div>
                  </td>
                  <td data-label="Stage">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className={`stage-dot ${STAGE_CONFIG[lead.stage]?.class}`} />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{STAGE_CONFIG[lead.stage]?.short || lead.stage}</span>
                    </div>
                  </td>
                  <td data-label="Priority">
                    <span className={`badge ${PRIORITY_CONFIG[lead.priority]?.class}`}>
                      {PRIORITY_CONFIG[lead.priority]?.label}
                    </span>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Score: {lead.lead_score}</div>
                  </td>
                  <td data-label="Project" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {lead.project?.name || (lead.project_id ? '...' : '—')}
                    {lead.configuration && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{lead.configuration}</div>}
                  </td>
                  {canViewAllLeads && (
                    <td data-label="Assignee" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {lead.assignee ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: 'var(--color-accent)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.65rem', fontWeight: 700, color: 'white',
                          }}>
                            {getInitials(lead.assignee.name)}
                          </div>
                          {lead.assignee.name}
                        </div>
                      ) : <span style={{ color: 'var(--color-warning)' }}>Unassigned</span>}
                    </td>
                  )}
                  <td data-label="Activity" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {formatRelative(lead.last_activity_at)}
                  </td>
                  <td data-label="Created" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {formatDate(lead.created_at)}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        onClick={() => { setEditLead(lead); setShowLeadForm(true); }}
                        className="btn btn-ghost btn-sm btn-icon"
                        title="Edit"
                      ><Pencil size={13} strokeWidth={1.75} /></button>
                    </div>
                  </td>
                </tr>
              ))
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
