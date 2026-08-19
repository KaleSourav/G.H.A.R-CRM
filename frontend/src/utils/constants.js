// ── Pipeline Stages (exact spec §2.1) ─────────────────────────────────────
export const PIPELINE_STAGES = [
  'New / Unassigned',
  'Contacted',
  'Qualified',
  'Site Visit Scheduled',
  'Site Visit Done',
  'Negotiation',
  'Booking',
  'Sold / Closed Won',
  'Lost / Dropped',
  'On Hold / Nurture',
];

export const TERMINAL_STAGES = ['Sold / Closed Won', 'Lost / Dropped'];

export const STAGE_CONFIG = {
  'New / Unassigned':     { color: '#64748B', class: 'stage-new',         short: 'New' },
  'Contacted':            { color: '#3B82F6', class: 'stage-contacted',   short: 'Contacted' },
  'Qualified':            { color: '#6366F1', class: 'stage-qualified',   short: 'Qualified' },
  'Site Visit Scheduled': { color: '#F59E0B', class: 'stage-svscheduled', short: 'SV Sched.' },
  'Site Visit Done':      { color: '#EC4899', class: 'stage-svdone',      short: 'SV Done' },
  'Negotiation':          { color: '#8B5CF6', class: 'stage-negotiation', short: 'Negotiation' },
  'Booking':              { color: '#F59E0B', class: 'stage-booking',     short: 'Booking' },
  'Sold / Closed Won':    { color: '#10B981', class: 'stage-sold',        short: 'Sold' },
  'Lost / Dropped':       { color: '#EF4444', class: 'stage-lost',        short: 'Lost' },
  'On Hold / Nurture':    { color: '#475569', class: 'stage-nurture',     short: 'On Hold' },
};

// ── Lost Reasons (spec §2.1) ──────────────────────────────────────────────
export const LOST_REASONS = [
  'Budget mismatch',
  'Location mismatch',
  'Competitor',
  'Unresponsive',
  'Not genuine',
  'Property not available',
  'Delayed decision',
  'Other',
];

// ── Lead Sources (spec §2.1) ──────────────────────────────────────────────
export const LEAD_SOURCES = [
  'Website Form',
  'Facebook Ad',
  'Instagram Ad',
  'Google Ad',
  '99acres',
  'MagicBricks',
  'Housing.com',
  'NoBroker',
  'Walk-in',
  'Referral - Client',
  'Referral - Channel Partner',
  'WhatsApp Inbound',
  'Inbound Call',
  'Missed Call',
  'Manual Entry',
  'CSV Import',
];

// ── Configurations ─────────────────────────────────────────────────────────
export const CONFIGURATIONS = [
  '1BHK', '2BHK', '3BHK', '4BHK', '5BHK',
  'Villa', 'Plot', 'Studio', 'Commercial',
];

// ── Purposes ───────────────────────────────────────────────────────────────
export const PURPOSES = [
  { value: 'self_use', label: 'Self Use' },
  { value: 'investment', label: 'Investment' },
  { value: 'rental', label: 'Rental' },
  { value: 'not_specified', label: 'Not Specified' },
];

// ── Task Types ─────────────────────────────────────────────────────────────
export const TASK_TYPES = [
  { value: 'call', label: '📞 Call', icon: '📞' },
  { value: 'follow_up', label: '🔔 Follow Up', icon: '🔔' },
  { value: 'site_visit', label: '🏗️ Site Visit', icon: '🏗️' },
  { value: 'document', label: '📄 Document', icon: '📄' },
  { value: 'email', label: '📧 Email', icon: '📧' },
  { value: 'whatsapp', label: '💬 WhatsApp', icon: '💬' },
  { value: 'other', label: '📋 Other', icon: '📋' },
];

// ── Activity Types ─────────────────────────────────────────────────────────
export const ACTIVITY_TYPE_CONFIG = {
  note:             { icon: '📝', label: 'Note', color: '#94A3B8' },
  call:             { icon: '📞', label: 'Call', color: '#3B82F6' },
  email:            { icon: '📧', label: 'Email', color: '#6366F1' },
  whatsapp:         { icon: '💬', label: 'WhatsApp', color: '#10B981' },
  sms:              { icon: '💬', label: 'SMS', color: '#94A3B8' },
  stage_change:     { icon: '🔄', label: 'Stage Changed', color: '#F59E0B' },
  assignment:       { icon: '👤', label: 'Assignment', color: '#8B5CF6' },
  task_created:     { icon: '✅', label: 'Task Created', color: '#EC4899' },
  site_visit_scheduled: { icon: '🏗️', label: 'Site Visit Scheduled', color: '#F59E0B' },
  site_visit_done:  { icon: '✅', label: 'Site Visit Done', color: '#10B981' },
  document_uploaded:{ icon: '📄', label: 'Document Uploaded', color: '#94A3B8' },
  score_changed:    { icon: '⭐', label: 'Score Updated', color: '#F59E0B' },
  csv_import:       { icon: '📥', label: 'CSV Import', color: '#94A3B8' },
};

// ── Roles ──────────────────────────────────────────────────────────────────
export const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Sales Manager' },
  { value: 'executive', label: 'Sales Executive' },
  { value: 'front_office', label: 'Front Office' },
  { value: 'finance', label: 'Finance' },
  { value: 'channel_partner', label: 'Channel Partner' },
];

// ── Priority config ────────────────────────────────────────────────────────
export const PRIORITY_CONFIG = {
  hot:  { label: 'Hot', class: 'badge-hot',  emoji: '🔴' },
  warm: { label: 'Warm', class: 'badge-warm', emoji: '🟡' },
  cold: { label: 'Cold', class: 'badge-cold', emoji: '🔵' },
};

// ── Org slug (matches seed data) ───────────────────────────────────────────
export const ORG_SLUG = 'ghar';
