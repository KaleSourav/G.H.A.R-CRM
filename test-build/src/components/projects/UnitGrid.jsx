import { useState } from 'react';
import { projectsAPI } from '../../services/api';
import { formatCurrency } from '../../utils/helpers';
import { LayoutGrid, List, Building } from 'lucide-react';
import UnitForm from './UnitForm';

const STATUS_CONFIG = {
  available: { label: 'Available', class: 'badge-available', bg: 'rgba(16,185,129,0.08)' },
  held:      { label: 'Held',      class: 'badge-held',      bg: 'rgba(245,158,11,0.08)' },
  booked:    { label: 'Booked',    class: 'badge-booked',    bg: 'rgba(99,102,241,0.08)' },
  sold:      { label: 'Sold',      class: 'badge-sold',      bg: 'rgba(239,68,68,0.08)' },
};

export default function UnitGrid({ units, projectId, onUnitUpdated }) {
  const [editUnit, setEditUnit] = useState(null);
  const [view, setView] = useState('grid'); // grid | table

  if (units.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><Building size={22} strokeWidth={1.5} /></div>
        <p style={{ fontWeight: 600 }}>No units found</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Add units to manage inventory</p>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginBottom: '0.5rem' }}>
        <button onClick={() => setView('grid')} className={`btn btn-sm ${view === 'grid' ? 'btn-primary' : 'btn-secondary'}`}>
          <LayoutGrid size={13} strokeWidth={1.75} /> Grid
        </button>
        <button onClick={() => setView('table')} className={`btn btn-sm ${view === 'table' ? 'btn-primary' : 'btn-secondary'}`}>
          <List size={13} strokeWidth={1.75} /> Table
        </button>
      </div>

      {view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
          {units.map(unit => {
            const conf = STATUS_CONFIG[unit.status] || STATUS_CONFIG.available;
            return (
              <button
                key={unit.id}
                onClick={() => setEditUnit(unit)}
                style={{
                  padding: '1rem',
                  background: conf.bg,
                  border: `1px solid ${unit.status === 'available' ? 'rgba(16,185,129,0.3)' : unit.status === 'held' ? 'rgba(245,158,11,0.3)' : unit.status === 'booked' ? 'rgba(99,102,241,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  borderRadius: '10px',
                  textAlign: 'left', cursor: 'pointer',
                  transition: 'all 150ms',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{unit.unit_number}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {unit.configuration}
                  {unit.floor && <span> · Floor {unit.floor}</span>}
                </div>
                {unit.area_sqft && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{unit.area_sqft} sqft</div>}
                {unit.price && <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)', marginTop: '0.25rem' }}>{formatCurrency(unit.price)}</div>}
                <span className={`badge ${conf.class}`} style={{ marginTop: '0.4rem', fontSize: '0.6rem' }}>{conf.label}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Config</th>
                <th>Floor</th>
                <th>Area (sqft)</th>
                <th>Price</th>
                <th>Status</th>
                <th>Facing</th>
              </tr>
            </thead>
            <tbody>
              {units.map(unit => (
                <tr key={unit.id} onClick={() => setEditUnit(unit)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 600 }}>{unit.unit_number}</td>
                  <td>{unit.configuration}</td>
                  <td>{unit.floor || '—'}</td>
                  <td>{unit.area_sqft?.toLocaleString('en-IN') || '—'}</td>
                  <td style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{formatCurrency(unit.price)}</td>
                  <td><span className={`badge ${STATUS_CONFIG[unit.status]?.class}`}>{unit.status}</span></td>
                  <td style={{ color: 'var(--text-muted)' }}>{unit.facing || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editUnit && (
        <UnitForm
          unit={editUnit}
          projectId={projectId}
          onClose={() => setEditUnit(null)}
          onSave={() => { setEditUnit(null); onUnitUpdated(); }}
        />
      )}
    </>
  );
}
