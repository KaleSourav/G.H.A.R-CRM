import { useState } from 'react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user } = useAuth();
  const [orgSettings, setOrgSettings] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    try {
      const { data } = await authAPI.orgSettings();
      setOrgSettings(data);
      setLoaded(true);
    } catch { toast.error('Failed to load settings'); }
  };

  if (!loaded) { load(); }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 800 }}>
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Organization configuration</p>
      </div>

      {/* Org Info */}
      {orgSettings && (
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Organization</h2>
          <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border-light)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Name</span>
              <strong>{orgSettings.name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border-light)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Slug</span>
              <code style={{ background: 'var(--color-surface-2)', padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>{orgSettings.slug}</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border-light)' }}>
              <span style={{ color: 'var(--text-muted)' }}>SLA Window</span>
              <strong>{orgSettings.settings?.sla_hours * 60} minutes</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Assignment Mode</span>
              <strong>{orgSettings.settings?.assignment_mode?.replace('_', ' ')}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline stages */}
      {orgSettings?.settings?.pipeline_stages && (
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Pipeline Stages</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {orgSettings.settings.pipeline_stages.map((stage, i) => (
              <div key={stage} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px', fontSize: '0.875rem',
              }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', width: 20 }}>{i + 1}.</span>
                {stage}
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
            Pipeline stages are configurable in the database. Custom stage UI coming in Phase 2.
          </p>
        </div>
      )}

      {/* Phase 2 preview */}
      <div className="card" style={{ border: '1px dashed var(--color-border)', opacity: 0.7 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
          Phase 2 Settings (Coming Soon)
        </h2>
        <ul style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingLeft: '1.25rem' }}>
          <li>Custom pipeline stage editor</li>
          <li>WhatsApp / SMS integration configuration</li>
          <li>Email template management</li>
          <li>Meta Lead Ads webhook setup</li>
          <li>Custom field builder</li>
          <li>Commission structure configuration</li>
        </ul>
      </div>
    </div>
  );
}
