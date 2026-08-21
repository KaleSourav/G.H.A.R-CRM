import { PIPELINE_STAGES, LEAD_SOURCES, CONFIGURATIONS } from '../../utils/constants';

export default function LeadFilters({ filters, onChange, onReset, executives, projects, canFilterByExec }) {
  const isActive = Object.values(filters).some(v => v);

  return (
    <div className="card" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Filters</span>
        {isActive && <button onClick={onReset} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}>Clear All</button>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
        <div className="form-group">
          <label className="form-label">Stage</label>
          <select className="form-select" value={filters.stage} onChange={e => onChange('stage', e.target.value)}>
            <option value="">All Stages</option>
            {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Source</label>
          <select className="form-select" value={filters.source} onChange={e => onChange('source', e.target.value)}>
            <option value="">All Sources</option>
            {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Priority</label>
          <select className="form-select" value={filters.priority} onChange={e => onChange('priority', e.target.value)}>
            <option value="">All</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </select>
        </div>
        {canFilterByExec && executives.length > 0 && (
          <div className="form-group">
            <label className="form-label">Assigned To</label>
            <select className="form-select" value={filters.assigned_to} onChange={e => onChange('assigned_to', e.target.value)}>
              <option value="">Everyone</option>
              {executives.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
        )}
        {projects.length > 0 && (
          <div className="form-group">
            <label className="form-label">Project</label>
            <select className="form-select" value={filters.project_id} onChange={e => onChange('project_id', e.target.value)}>
              <option value="">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">SLA Status</label>
          <select className="form-select" value={filters.sla_breach} onChange={e => onChange('sla_breach', e.target.value)}>
            <option value="">All</option>
            <option value="true">SLA Breach</option>
            <option value="false">On Time</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Date From</label>
          <input className="form-input" type="date" value={filters.date_from} onChange={e => onChange('date_from', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Date To</label>
          <input className="form-input" type="date" value={filters.date_to} onChange={e => onChange('date_to', e.target.value)} />
        </div>
      </div>
    </div>
  );
}
