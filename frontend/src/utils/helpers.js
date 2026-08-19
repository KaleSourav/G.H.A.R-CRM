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

export const formatCurrencyFull = (amount) => {
  if (!amount) return '₹0';
  return `₹${amount.toLocaleString('en-IN')}`;
};

// ── Phone formatting ───────────────────────────────────────────────────────
export const formatPhone = (phone) => {
  if (!phone) return '—';
  const cleaned = String(phone).replace(/\D/g, '').slice(-10);
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
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
  if (score >= 70) return '#EF4444';  // hot — red
  if (score >= 40) return '#F59E0B';  // warm — gold
  return '#64748B';                    // cold — grey
};

// ── Stage to CSS class ─────────────────────────────────────────────────────
export const stageToClass = (stage) => {
  const map = {
    'New / Unassigned': 'stage-new',
    'Contacted': 'stage-contacted',
    'Qualified': 'stage-qualified',
    'Site Visit Scheduled': 'stage-svscheduled',
    'Site Visit Done': 'stage-svdone',
    'Negotiation': 'stage-negotiation',
    'Booking': 'stage-booking',
    'Sold / Closed Won': 'stage-sold',
    'Lost / Dropped': 'stage-lost',
    'On Hold / Nurture': 'stage-nurture',
  };
  return map[stage] || 'stage-new';
};

// ── Debounce ───────────────────────────────────────────────────────────────
export const debounce = (fn, delay = 300) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

// ── Download as CSV ────────────────────────────────────────────────────────
export const downloadCSV = (data, filename) => {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = [headers, ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')))];
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

// ── Copy to clipboard ──────────────────────────────────────────────────────
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
