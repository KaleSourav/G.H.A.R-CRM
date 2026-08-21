import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core';
import { supabase } from '../supabaseClient';
import { leadsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PIPELINE_STAGES, STAGE_CONFIG, PRIORITY_CONFIG } from '../utils/constants';
import { formatPhone, formatCurrency, formatRelative, getInitials } from '../utils/helpers';
import { Phone, IndianRupee, AlertTriangle, Users } from 'lucide-react';
import LostReasonModal from '../components/pipeline/LostReasonModal';
import toast from 'react-hot-toast';

// ── Kanban Column ─────────────────────────────────────────────────────────
function KanbanColumn({ stage, leads, onDropLead, onLeadClick }) {
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

  return (
    <div
      className="kanban-column"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        border: isDragOver ? `2px solid ${color || 'var(--color-primary)'}` : '1px solid var(--color-border)',
        background: isDragOver ? `${color}08` : 'var(--color-surface)',
        transition: 'border-color 150ms, background 150ms',
      }}
    >
      <div className="kanban-column-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color || '#64748B', flexShrink: 0 }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {STAGE_CONFIG[stage]?.short || stage}
            </span>
          </div>
          <span style={{
            fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem',
            background: 'var(--color-surface-2)', borderRadius: '999px',
            color: 'var(--text-secondary)',
          }}>
            {leads.length}
          </span>
        </div>
      </div>
      <div className="kanban-column-body">
        {leads.length === 0 && isDragOver && (
          <div style={{
            border: `2px dashed ${color || 'var(--color-border)'}`,
            borderRadius: '8px', padding: '1rem',
            textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)',
          }}>
            Drop here
          </div>
        )}
        {leads.map(lead => (
          <KanbanCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead.id)} />
        ))}
      </div>
    </div>
  );
}

// ── Kanban Card ───────────────────────────────────────────────────────────
function KanbanCard({ lead, onClick }) {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('leadId', lead.id);
    e.currentTarget.style.opacity = '0.5';
  };
  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
  };

  return (
    <div
      className="kanban-card"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onClick}
    >
      {/* Lead info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.65rem', fontWeight: 700, color: 'white', flexShrink: 0,
        }}>
          {getInitials(lead.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {lead.name}
          </div>
          {lead.project?.name && (
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lead.project.name}
            </div>
          )}
        </div>
        <span className={`badge ${PRIORITY_CONFIG[lead.priority]?.class}`} style={{ fontSize: '0.55rem', padding: '0.1rem 0.4rem' }}>
          {PRIORITY_CONFIG[lead.priority]?.label?.[0]}
        </span>
      </div>

      {/* Contact */}
      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        <Phone size={11} strokeWidth={1.75} style={{ flexShrink: 0 }} />
        {formatPhone(lead.phone)}
      </div>

      {/* Budget */}
      {lead.budget_max && (
        <div style={{ fontSize: '0.7rem', color: 'var(--color-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <IndianRupee size={10} strokeWidth={1.75} style={{ flexShrink: 0 }} />
          {formatCurrency(lead.budget_max)}
          {lead.configuration && ` · ${lead.configuration}`}
        </div>
      )}

      {/* Footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: '1px solid var(--color-border-light)',
        paddingTop: '0.5rem', marginTop: '0.25rem',
      }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
          {formatRelative(lead.last_activity_at)}
        </div>
        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
          {lead.sla_breach && <AlertTriangle size={11} strokeWidth={2} color="var(--color-danger)" title="SLA Breach" />}
          {lead.assignee && (
            <div title={lead.assignee.name} style={{
              width: 20, height: 20, borderRadius: '50%',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.55rem', fontWeight: 700, color: 'white',
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
  const [loading, setLoading] = useState(true);
  const [showLostModal, setShowLostModal] = useState(false);
  const [pendingDrop, setPendingDrop] = useState(null);
  const [filterProject, setFilterProject] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await leadsAPI.list({ limit: 500 });
      setLeads(data.leads || []);
    } catch { toast.error('Failed to load pipeline'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadLeads();

    // Supabase Realtime — live updates when leads are modified by anyone
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

    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: newStage } : l));

    try {
      await leadsAPI.update(leadId, { stage: newStage });
      toast.success(`"${lead.name}" → ${newStage}`);
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

  // Group leads by stage
  const filteredLeads = leads.filter(l => {
    if (filterProject && l.project_id !== filterProject) return false;
    if (filterPriority && l.priority !== filterPriority) return false;
    return true;
  });

  const byStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage] = filteredLeads.filter(l => l.stage === stage);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Pipeline</h1>
          <p className="page-subtitle">{filteredLeads.length} leads across {PIPELINE_STAGES.length} stages</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
          <select className="form-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ fontSize: '0.8rem', padding: '0.375rem 2rem 0.375rem 0.75rem', width: 'auto' }}>
            <option value="">All Priority</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </select>
          <button onClick={loadLeads} className="btn btn-secondary btn-sm">↻ Refresh</button>
          <button onClick={() => navigate('/leads')} className="btn btn-secondary btn-sm">List View</button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {['New / Unassigned', 'Contacted', 'Qualified', 'Site Visit Scheduled', 'Booking', 'Sold / Closed Won'].map(stage => (
          <div key={stage} style={{
            padding: '0.375rem 0.75rem',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: STAGE_CONFIG[stage]?.color || '#64748B' }} />
            {STAGE_CONFIG[stage]?.short}: <strong style={{ color: 'var(--text-primary)' }}>{byStage[stage]?.length || 0}</strong>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
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
    </div>
  );
}
