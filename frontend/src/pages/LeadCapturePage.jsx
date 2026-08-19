import { useState } from 'react';
import { ORG_SLUG, CONFIGURATIONS, LEAD_SOURCES } from '../utils/constants';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export default function LeadCapturePage() {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', source: 'Website Form',
    budget_max: '', configuration: '', notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, org_slug: ORG_SLUG }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--color-bg)', padding: '1.5rem',
      }}>
        <div style={{
          textAlign: 'center', maxWidth: 400, padding: '3rem 2rem',
          background: 'var(--color-surface)', borderRadius: '20px',
          border: '1px solid var(--color-border)',
          animation: 'slideUp 0.4s ease',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏠</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            Thank You!
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            We've received your enquiry. Our team will contact you within 30 minutes.
          </p>
          <div style={{
            marginTop: '1.5rem', padding: '0.875rem',
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: '10px', fontSize: '0.8rem', color: 'var(--color-success)',
          }}>
            ✅ Your enquiry is confirmed
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg)', padding: '1.5rem',
    }}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '20px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        animation: 'slideUp 0.4s ease',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          padding: '2rem',
          borderBottom: '1px solid var(--color-border)',
          textAlign: 'center',
          position: 'relative',
        }}>
          <div style={{
            width: 48, height: 48,
            background: 'linear-gradient(135deg, #F59E0B, #D97706)',
            borderRadius: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.25rem', fontWeight: 800, color: '#0F172A',
            margin: '0 auto 1rem',
            boxShadow: '0 0 20px rgba(245,158,11,0.3)',
          }}>G</div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Register Your Interest
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            G.H.A.R — Gem Homes Advisory & Realtors
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label" htmlFor="cap-name">Full Name *</label>
              <input
                id="cap-name"
                className="form-input"
                placeholder="Your full name"
                value={form.name}
                onChange={e => setForm(f => ({...f, name: e.target.value}))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="cap-phone">Mobile Number *</label>
              <input
                id="cap-phone"
                className="form-input"
                type="tel"
                placeholder="98765 43210"
                value={form.phone}
                onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="cap-email">Email</label>
              <input
                id="cap-email"
                className="form-input"
                type="email"
                placeholder="you@email.com"
                value={form.email}
                onChange={e => setForm(f => ({...f, email: e.target.value}))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Configuration</label>
              <select className="form-select" value={form.configuration} onChange={e => setForm(f => ({...f, configuration: e.target.value}))}>
                <option value="">Select...</option>
                {CONFIGURATIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Budget (approx.)</label>
              <select className="form-select" value={form.budget_max} onChange={e => setForm(f => ({...f, budget_max: e.target.value}))}>
                <option value="">Select range</option>
                <option value="3000000">Up to ₹30L</option>
                <option value="5000000">Up to ₹50L</option>
                <option value="7500000">Up to ₹75L</option>
                <option value="10000000">Up to ₹1 Cr</option>
                <option value="15000000">Up to ₹1.5 Cr</option>
                <option value="25000000">₹1.5 Cr+</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Message (optional)</label>
              <textarea
                className="form-textarea"
                placeholder="Any specific requirements or questions..."
                value={form.notes}
                onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                rows={3}
              />
            </div>
          </div>

          {error && (
            <div style={{
              padding: '0.75rem', background: 'var(--color-danger-dim)',
              border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px',
              fontSize: '0.8rem', color: 'var(--color-danger)',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ justifyContent: 'center', padding: '0.875rem', marginTop: '0.25rem', fontSize: '0.95rem' }}
          >
            {submitting ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Submitting...</> : 'Submit Enquiry →'}
          </button>

          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
            By submitting, you agree to be contacted by our team.<br/>
            Your data is protected under our privacy policy.
          </p>
        </form>
      </div>
    </div>
  );
}
