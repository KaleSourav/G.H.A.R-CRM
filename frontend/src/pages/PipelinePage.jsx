import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { leadsAPI, projectsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PIPELINE_STAGES, STAGE_CONFIG, PRIORITY_CONFIG } from '../utils/constants';
import { formatPhone, formatCurrency, formatRelative, getInitials, getWhatsAppUrl } from '../utils/helpers';
import {
  Phone, IndianRupee, AlertTriangle, Users, Layers,
  RefreshCw, ListFilter, MessageSquare, Flame, Sparkles, Building2,
} from 'lucide-react';
import LostReasonModal from '../components/pipeline/LostReasonModal';
import { WhatsAppIcon } from './LeadsPage';
import toast from 'react-hot-toast';

// ── Kanban Column ─────────────────────────────────────────────────────────
function KanbanColumn({ stage, leads, onDropLead, onLeadClick, onMoveStage, isVisibleOnMobile }) {
  const { color } = STAGE_CONFIG[stage] || {};
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const leadId = e.dataTransfer.getData('leadId');
    if (leadId) onDropLead(leadId, stage);
  };

  const columnTotalValue = leads.reduce((sum, l) => sum + (l.budget_max || l.budget_min || 0), 0);

  return (
    <div
      className={`kanban-column ${isVisibleOnMobile ? 'mobile-visible' : 'mobile-hidden'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        border: isDragOver ? `2px solid ${color || 'var(--color-primary)'}` : '1px solid var(--color-border)',
        background: isDragOver ? `${color}08` : 'var(--color-surface)',
        transition: 'border-color 150ms, background 150ms',
      }}
    >
      <div className="kanban-column-header" style={{ borderTop: `3px solid ${color || 'var(--color-primary)'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: color || '#64748B', flexShrink: 0 }} />
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {STAGE_CONFIG[stage]?.short || stage}
            </span>
          </div>
          <span style={{
            fontSize: '0.72rem', fontWeight: 800, padding: '0.15rem 0.55rem',
            background: 'var(--color-surface-2)', borderRadius: 'var(--radius-full)',
            color: 'var(--text-primary)', border: '1px solid var(--color-border)',
          }}>
            {leads.length}
          </span>
        </div>

        {columnTotalValue > 0 && (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem', fontWeight: 500 }}>
            Volume: <strong style={{ color: 'var(--color-primary)' }}>{formatCurrency(columnTotalValue)}</strong>
          </div>
        )}
      </div>

      <div className="kanban-column-body">
        {leads.length === 0 && isDragOver && (
          <div style={{
            border: `2px dashed ${color || 'var(--color-border)'}`,
            borderRadius: 'var(--radius)', padding: '1.25rem',
            textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)',
            background: 'var(--color-surface-2)',
          }}>
            Drop to move stage
          </div>
        )}
        {leads.length === 0 && !isDragOver && (
          <div style={{
            padding: '1.5rem 1rem',
            textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)',
            fontStyle: 'italic',
          }}>
            No leads in this stage
          </div>
        )}
        {leads.map(lead => (
          <KanbanCard
            key={lead.id}
            lead={lead}
            onClick={() => onLeadClick(lead.id)}
            onMoveStage={onMoveStage}
          />
        ))}
      </div>
    </div>
  );
}

// ── Kanban Card ───────────────────────────────────────────────────────────
function KanbanCard({ lead, onClick, onMoveStage }) {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('leadId', lead.id);
    e.currentTarget.style.opacity = '0.5';
  };
  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
  };

  const scoreClass = (lead.lead_score || 0) >= 70 ? 'high' : (lead.lead_score || 0) >= 40 ? 'medium' : 'low';

  return (
    <div
      className="kanban-card"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onClick}
    >
      {/* Lead info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, #4F6FE8, #7C3AED)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.7rem', fontWeight: 800, color: 'white', flexShrink: 0,
        }}>
          {getInitials(lead.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {lead.name}
          </div>
          {lead.project?.name && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lead.project.name}
            </div>
          )}
        </div>
        <span className={`score-badge ${scoreClass}`} style={{ fontSize: '0.64rem', padding: '0.12rem 0.45rem' }}>
          {lead.lead_score || 0}
        </span>
      </div>

      {/* Contact info & Quick WhatsApp / Call */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.45rem' }}>
        <a
          href={`tel:${lead.phone}`}
          onClick={e => e.stopPropagation()}
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-info)', fontWeight: 500 }}
        >
          <Phone size={12} strokeWidth={2} color="var(--color-info)" style={{ flexShrink: 0 }} />
          <span>{formatPhone(lead.phone)}</span>
        </a>
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
          <a
            href={getWhatsAppUrl(lead.phone, lead.name, lead.project?.name)}
            target="_blank"
            rel="noreferrer"
            title={`Chat with ${lead.name} on WhatsApp`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: 'rgba(37, 211, 102, 0.14)',
              border: '1px solid rgba(37, 211, 102, 0.35)',
              color: '#25D366',
              flexShrink: 0,
            }}
          >
            <WhatsAppIcon size={13} />
          </a>
        </div>
      </div>

      {/* Budget & Config */}
      {(lead.budget_max || lead.configuration) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.35rem',
          fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-primary)',
          background: 'var(--color-primary-dim)', padding: '0.2rem 0.5rem',
          borderRadius: 'var(--radius-sm)', marginBottom: '0.45rem', width: 'fit-content',
        }}>
          {lead.budget_max && <span>{formatCurrency(lead.budget_max)}</span>}
          {lead.configuration && <span style={{ opacity: 0.85 }}>· {lead.configuration}</span>}
        </div>
      )}

      {/* Move Stage Selector (touch-friendly mobile stage mover) */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: '0.45rem', marginTop: '0.35rem',
          borderTop: '1px solid var(--color-border-light)',
          gap: '0.5rem',
        }}
        onClick={e => e.stopPropagation()}
      >
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Move:
        </span>
        <select
          value={lead.stage}
          onChange={(e) => onMoveStage(lead.id, e.target.value)}
          aria-label="Change stage"
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: '0.72rem',
            fontWeight: 500,
            padding: '0.2rem 1.4rem 0.2rem 0.5rem',
            height: 28,
            minHeight: 28,
            background: 'var(--color-surface)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
          className="form-select"
        >
          {PIPELINE_STAGES.map(s => (
            <option key={s} value={s}>{STAGE_CONFIG[s]?.short || s}</option>
          ))}
        </select>
      </div>

      {/* Card Footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: '0.35rem', marginTop: '0.2rem',
      }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
          {formatRelative(lead.last_activity_at)}
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          {lead.sla_breach && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: 'var(--color-danger)', fontSize: '0.62rem', fontWeight: 700 }} title="SLA Breach">
              <AlertTriangle size={11} strokeWidth={2} /> SLA
            </span>
          )}
          {lead.assignee && (
            <div title={`Assigned to ${lead.assignee.name}`} style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.58rem', fontWeight: 700, color: 'white',
            }}>
              {getInitials(lead.assignee.name)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Pipeline Page ──────────────────────────────────────────────────────────
export default function PipelinePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLostModal, setShowLostModal] = useState(false);
  const [pendingDrop, setPendingDrop] = useState(null);
  const [filterProject, setFilterProject] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [activeMobileStage, setActiveMobileStage] = useState('ALL');

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsRes, projRes] = await Promise.all([
        leadsAPI.list({ limit: 500 }),
        projectsAPI.list().catch(() => ({ data: [] })),
      ]);
      setLeads(leadsRes.data?.leads || []);
      setProjects(projRes.data || []);
    } catch { toast.error('Failed to load pipeline'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadLeads();

    const channel = supabase
      .channel('pipeline-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        loadLeads();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [loadLeads]);

  const handleDropLead = async (leadId, newStage) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.stage === newStage) return;

    if (newStage === 'Lost / Dropped') {
      setPendingDrop({ leadId, stage: newStage });
      setShowLostModal(true);
      return;
    }

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: newStage } : l));

    try {
      await leadsAPI.update(leadId, { stage: newStage });
      toast.success(`"${lead.name}" moved to ${newStage}`);
    } catch {
      toast.error('Failed to update stage');
      loadLeads();
    }
  };

  const handleLostConfirm = async (reason) => {
    if (!pendingDrop) return;
    const lead = leads.find(l => l.id === pendingDrop.leadId);
    setLeads(prev => prev.map(l => l.id === pendingDrop.leadId ? { ...l, stage: 'Lost / Dropped', lost_reason: reason } : l));
    try {
      await leadsAPI.update(pendingDrop.leadId, { stage: 'Lost / Dropped', lost_reason: reason });
      toast.success(`"${lead?.name}" marked as Lost`);
    } catch { toast.error('Failed to update'); loadLeads(); }
    finally { setPendingDrop(null); setShowLostModal(false); }
  };

  const filteredLeads = leads.filter(l => {
    if (filterProject && l.project_id !== filterProject) return false;
    if (filterPriority && l.priority !== filterPriority) return false;
    return true;
  });

  const byStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage] = filteredLeads.filter(l => l.stage === stage);
    return acc;
  }, {});

  const totalPipelineValue = filteredLeads.reduce((sum, l) => {
    if (['Lost / Dropped', 'On Hold / Nurture'].includes(l.stage)) return sum;
    return sum + (l.budget_max || l.budget_min || 0);
  }, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
      {/* ── Header & Action Bar ─────────────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span className="live-pulse-dot" />
            <h1 className="page-title">Sales Pipeline Matrix</h1>
          </div>
          <p className="page-subtitle">
            {filteredLeads.length} active leads · Weighted Pipeline: <strong style={{ color: 'var(--color-primary)' }}>{formatCurrency(totalPipelineValue)}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {projects.length > 0 && (
            <select
              className="form-select"
              value={filterProject}
              onChange={e => setFilterProject(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '0.375rem 2rem 0.375rem 0.75rem', width: 'auto', minHeight: 36 }}
            >
              <option value="">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}

          <select
            className="form-select"
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            style={{ fontSize: '0.8rem', padding: '0.375rem 2rem 0.375rem 0.75rem', width: 'auto', minHeight: 36 }}
          >
            <option value="">All Priorities</option>
            <option value="hot">Hot Only</option>
            <option value="warm">Warm Only</option>
            <option value="cold">Cold Only</option>
          </select>

          <button onClick={loadLeads} className="btn btn-secondary btn-sm" title="Refresh Board">
            <RefreshCw size={13} strokeWidth={2} /> Refresh
          </button>
          <button onClick={() => navigate('/leads')} className="btn btn-secondary btn-sm">
            <ListFilter size={13} strokeWidth={2} /> Table View
          </button>
        </div>
      </div>

      {/* ── Interactive Stage Volume Filter Ribbon (Mobile & Desktop) ─── */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        overflowX: 'auto',
        paddingBottom: '0.4rem',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}>
        {/* All Stages Pill */}
        <button
          onClick={() => setActiveMobileStage('ALL')}
          style={{
            padding: '0.45rem 0.85rem',
            background: activeMobileStage === 'ALL' ? 'var(--color-primary-dim)' : 'var(--color-surface)',
            border: `1px solid ${activeMobileStage === 'ALL' ? 'var(--color-primary)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: activeMobileStage === 'ALL' ? 'var(--color-primary)' : 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            transition: 'all 150ms',
            flexShrink: 0,
            minHeight: 34,
          }}
        >
          <span>All Stages</span>
          <strong style={{ color: activeMobileStage === 'ALL' ? 'var(--color-primary)' : 'var(--text-primary)' }}>
            {filteredLeads.length}
          </strong>
        </button>

        {PIPELINE_STAGES.map(stage => {
          const count = byStage[stage]?.length || 0;
          const isSelected = activeMobileStage === stage;
          const conf = STAGE_CONFIG[stage];
          return (
            <button
              key={stage}
              onClick={() => setActiveMobileStage(isSelected ? 'ALL' : stage)}
              style={{
                padding: '0.45rem 0.85rem',
                background: isSelected ? `${conf?.color || 'var(--color-primary)'}22` : 'var(--color-surface)',
                border: `1px solid ${isSelected ? conf?.color || 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: isSelected ? 700 : 500,
                color: isSelected ? (conf?.color || 'var(--color-primary)') : 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', gap: '0.45rem',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 150ms',
                flexShrink: 0,
                minHeight: 34,
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: conf?.color || '#64748B' }} />
              <span>{conf?.short || stage}:</span>
              <strong style={{ color: isSelected ? conf?.color : 'var(--text-primary)' }}>{count}</strong>
            </button>
          );
        })}
      </div>

      {/* ── Kanban Drag & Drop Surface ──────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <span className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : (
        <div className="kanban-board">
          {PIPELINE_STAGES.map(stage => (
            <KanbanColumn
              key={stage}
              stage={stage}
              leads={byStage[stage] || []}
              onDropLead={handleDropLead}
              onLeadClick={(id) => navigate(`/leads/${id}`)}
              onMoveStage={handleDropLead}
              isVisibleOnMobile={activeMobileStage === 'ALL' || activeMobileStage === stage}
            />
          ))}
        </div>
      )}

      {showLostModal && (
        <LostReasonModal
          onConfirm={handleLostConfirm}
          onCancel={() => { setShowLostModal(false); setPendingDrop(null); loadLeads(); }}
        />
      )}

      <style>{`
        @media (max-width: 768px) {
          .kanban-board {
            height: auto !important;
            min-height: 55vh;
            overflow-x: auto;
            gap: 0.75rem !important;
            padding-bottom: 2rem !important;
          }
          .kanban-column.mobile-hidden {
            display: none !important;
          }
          .kanban-column.mobile-visible {
            display: flex !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
