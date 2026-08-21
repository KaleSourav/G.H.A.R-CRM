import { useState } from 'react';
import { leadsAPI } from '../../services/api';
import { X, CheckCircle, AlertTriangle, FileText, Download, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

const EXPECTED_COLUMNS = ['name', 'phone', 'email', 'source', 'project', 'budget_min', 'budget_max', 'configuration', 'notes'];

export default function CSVImportModal({ onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.csv') || f.name.endsWith('.xlsx'))) {
      setFile(f);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await leadsAPI.importCSV(formData);
      setResult(data);
      toast.success(`${data.imported} leads imported!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed');
    } finally { setUploading(false); }
  };

  const downloadTemplate = () => {
    const headers = EXPECTED_COLUMNS.join(',');
    const sample = 'Rajesh Kumar,9876543210,rajesh@email.com,Website Form,,5000000,10000000,3BHK,Interested in east-facing flat';
    const blob = new Blob([headers + '\n' + sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'leads-import-template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Import Leads via CSV</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={18} strokeWidth={1.75} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {result ? (
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'center' }}>
                {result.failed === 0
                  ? <CheckCircle size={36} strokeWidth={1.5} color="var(--color-success)" />
                  : <AlertTriangle size={36} strokeWidth={1.5} color="var(--color-warning)" />
                }
              </div>
              <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Import Complete</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                {[
                  { label: 'Imported', value: result.imported, color: 'var(--color-success)' },
                  { label: 'Duplicates', value: result.duplicates, color: 'var(--color-warning)' },
                  { label: 'Failed', value: result.failed, color: 'var(--color-danger)' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--color-surface-2)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {result.errors?.length > 0 && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--color-danger-dim)', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--color-danger)', textAlign: 'left', maxHeight: 120, overflowY: 'auto' }}>
                  {result.errors.slice(0, 10).map((e, i) => <div key={i}>{e}</div>)}
                </div>
              )}
              <button onClick={onImported} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Instructions */}
              <div style={{ padding: '0.75rem', background: 'var(--color-info-dim)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <p style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <FileText size={13} strokeWidth={1.75} /> Column mapping (flexible)
                </p>
                <p>Our importer detects common column names automatically. Required: <strong>name</strong>, <strong>phone</strong>. Download the template for the exact format.</p>
                <button onClick={downloadTemplate} className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                  <Download size={12} strokeWidth={1.75} /> Download Template
                </button>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--color-primary)' : file ? 'var(--color-success)' : 'var(--color-border)'}`,
                  borderRadius: '12px',
                  padding: '2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: dragOver ? 'var(--color-primary-dim)' : file ? 'var(--color-success-dim)' : 'transparent',
                  transition: 'all 200ms',
                }}
                onClick={() => document.getElementById('csv-file-input').click()}
              >
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={e => setFile(e.target.files[0])}
                  style={{ display: 'none' }}
                />
                <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                  {file
                    ? <CheckCircle size={28} strokeWidth={1.5} color="var(--color-success)" />
                    : <Upload size={28} strokeWidth={1.25} color="var(--text-muted)" />
                  }
                </div>
                {file ? (
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--color-success)' }}>{file.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {(file.size / 1024).toFixed(1)} KB • Click to change
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontWeight: 600 }}>Drop CSV file here</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>or click to browse • .csv or .xlsx</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {!result && (
          <div className="modal-footer">
            <button onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button
              onClick={handleImport}
              className="btn btn-primary"
              disabled={!file || uploading}
            >
              {uploading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Importing...</> : 'Import Leads'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
