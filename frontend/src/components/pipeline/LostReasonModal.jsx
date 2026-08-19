import { useState } from 'react';
import { LOST_REASONS } from '../../utils/constants';

export default function LostReasonModal({ onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const [custom, setCustom] = useState('');

  const handleConfirm = () => {
    const finalReason = reason === 'Other' ? (custom || 'Other') : reason;
    if (!finalReason) { alert('Please select a lost reason'); return; }
    onConfirm(finalReason);
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-danger)' }}>
              🚫 Mark as Lost
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Select a reason to move this lead to Lost
            </p>
          </div>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {LOST_REASONS.map(r => (
              <button
                key={r}
                onClick={() => setReason(r)}
                style={{
                  padding: '0.625rem 0.875rem',
                  borderRadius: '8px',
                  background: reason === r ? 'rgba(239,68,68,0.1)' : 'var(--color-surface-2)',
                  border: `1px solid ${reason === r ? 'rgba(239,68,68,0.4)' : 'var(--color-border)'}`,
                  color: reason === r ? 'var(--color-danger)' : 'var(--text-primary)',
                  fontSize: '0.875rem', textAlign: 'left', cursor: 'pointer',
                  transition: 'all 150ms', fontWeight: reason === r ? 600 : 400,
                }}
              >
                {reason === r ? '● ' : '○ '}{r}
              </button>
            ))}
          </div>

          {reason === 'Other' && (
            <div className="form-group">
              <label className="form-label">Specify Reason</label>
              <input
                className="form-input"
                placeholder="Please specify..."
                value={custom}
                onChange={e => setCustom(e.target.value)}
                autoFocus
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onCancel} className="btn btn-secondary">Cancel</button>
          <button
            onClick={handleConfirm}
            className="btn btn-danger"
            disabled={!reason}
          >
            Confirm Lost
          </button>
        </div>
      </div>
    </div>
  );
}
