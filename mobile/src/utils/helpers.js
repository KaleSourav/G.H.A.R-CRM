import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday, isPast } from 'date-fns';

// ── Date formatting ────────────────────────────────────────────────────────
export const formatDate = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  if (isToday(d)) return `Today, ${format(d, 'h:mm a')}`;
  if (isYesterday(d)) return `Yesterday, ${format(d, 'h:mm a')}`;
  if (isTomorrow(d)) return `Tomorrow, ${format(d, 'h:mm a')}`;
  return format(d, 'dd MMM yyyy');
};

export const formatDateTime = (date) => {
  if (!date) return '—';
  return format(new Date(date), 'dd MMM yyyy, h:mm a');
};

export const formatRelative = (date) => {
  if (!date) return '—';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const formatShortDate = (date) => {
  if (!date) return '—';
  return format(new Date(date), 'dd MMM');
};

export const isOverdue = (date) => {
  if (!date) return false;
  return isPast(new Date(date));
};

// ── Currency formatting (INR) ─────────────────────────────────────────────
export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '—';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toLocaleString('en-IN')}`;
};

// ── Phone formatting ───────────────────────────────────────────────────────
export const formatPhone = (phone) => {
  if (!phone) return '—';
  const cleaned = String(phone).replace(/\D/g, '').slice(-10);
  if (cleaned.length === 10) return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  return phone;
};

// ── Initials for avatars ───────────────────────────────────────────────────
export const getInitials = (name) => {
  if (!name) return '?';
  return name.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
};

// ── Truncate text ──────────────────────────────────────────────────────────
export const truncate = (str, len = 50) => {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
};

// ── Plural helper ──────────────────────────────────────────────────────────
export const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

// ── Lead score color ───────────────────────────────────────────────────────
export const getScoreColor = (score) => {
  if (score >= 70) return '#EF4444';
  if (score >= 40) return '#F59E0B';
  return '#64748B';
};

// ── WhatsApp URL ──────────────────────────────────────────────────────────
export const getWhatsAppUrl = (phone, leadName = '', projectName = '') => {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) digits = '91' + digits;
  const greeting = leadName ? `Hello ${leadName}` : 'Hello';
  const text = projectName
    ? `${greeting}, thank you for connecting regarding ${projectName}. How may we assist you today?`
    : `${greeting}, thank you for connecting with G.H.A.R Real Estate. How may we assist you today?`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
};
