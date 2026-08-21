// ── Pipeline Stages ────────────────────────────────────────────────────────
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
  'Qualified':            { color: '#4F6FE8', class: 'stage-qualified',   short: 'Qualified' },
  'Site Visit Scheduled': { color: '#F59E0B', class: 'stage-svscheduled', short: 'SV Sched.' },
  'Site Visit Done':      { color: '#EC4899', class: 'stage-svdone',      short: 'SV Done' },
  'Negotiation':          { color: '#8B5CF6', class: 'stage-negotiation', short: 'Negotiation' },
  'Booking':              { color: '#E8A020', class: 'stage-booking',     short: 'Booking' },
  'Sold / Closed Won':    { color: '#22C55E', class: 'stage-sold',        short: 'Sold' },
  'Lost / Dropped':       { color: '#EF4444', class: 'stage-lost',        short: 'Lost' },
  'On Hold / Nurture':    { color: '#475569', class: 'stage-nurture',     short: 'On Hold' },
};

// ── Lost Reasons ──────────────────────────────────────────────────────────
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

// ── Lead Sources ──────────────────────────────────────────────────────────
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
  { value: 'self_use',       label: 'Self Use' },
  { value: 'investment',     label: 'Investment' },
  { value: 'rental',         label: 'Rental' },
  { value: 'not_specified',  label: 'Not Specified' },
];

// ── Task Types ─────────────────────────────────────────────────────────────
// icon field now references Lucide icon name (string) — imported individually in components
export const TASK_TYPES = [
  { value: 'call',       label: 'Call',        iconName: 'Phone' },
  { value: 'follow_up',  label: 'Follow Up',   iconName: 'Bell' },
  { value: 'site_visit', label: 'Site Visit',  iconName: 'Building2' },
  { value: 'document',   label: 'Document',    iconName: 'FileText' },
  { value: 'email',      label: 'Email',       iconName: 'Mail' },
  { value: 'whatsapp',   label: 'WhatsApp',    iconName: 'MessageSquare' },
  { value: 'other',      label: 'Other',       iconName: 'MoreHorizontal' },
];

// ── Activity Types ─────────────────────────────────────────────────────────
export const ACTIVITY_TYPE_CONFIG = {
  note:                  { iconName: 'FileText',   label: 'Note',                color: '#94A3B8' },
  call:                  { iconName: 'Phone',       label: 'Call',                color: '#3B82F6' },
  email:                 { iconName: 'Mail',        label: 'Email',               color: '#4F6FE8' },
  whatsapp:              { iconName: 'MessageSquare', label: 'WhatsApp',          color: '#22C55E' },
  sms:                   { iconName: 'MessageSquare', label: 'SMS',               color: '#94A3B8' },
  stage_change:          { iconName: 'RotateCcw',   label: 'Stage Changed',       color: '#E8A020' },
  assignment:            { iconName: 'UserCheck',   label: 'Assignment',          color: '#8B5CF6' },
  task_created:          { iconName: 'CheckSquare', label: 'Task Created',        color: '#EC4899' },
  site_visit_scheduled:  { iconName: 'MapPin',      label: 'Site Visit Scheduled', color: '#F59E0B' },
  site_visit_done:       { iconName: 'CheckCircle', label: 'Site Visit Done',     color: '#22C55E' },
  document_uploaded:     { iconName: 'Upload',      label: 'Document Uploaded',   color: '#94A3B8' },
  score_changed:         { iconName: 'TrendingUp',  label: 'Score Updated',       color: '#E8A020' },
  csv_import:            { iconName: 'Download',    label: 'CSV Import',          color: '#94A3B8' },
};

// ── Roles ──────────────────────────────────────────────────────────────────
export const ROLES = [
  { value: 'admin',            label: 'Admin' },
  { value: 'manager',          label: 'Sales Manager' },
  { value: 'executive',        label: 'Sales Executive' },
  { value: 'front_office',     label: 'Front Office' },
  { value: 'finance',          label: 'Finance' },
  { value: 'channel_partner',  label: 'Channel Partner' },
];

// ── Priority config ────────────────────────────────────────────────────────
export const PRIORITY_CONFIG = {
  hot:  { label: 'Hot',  class: 'badge-hot',  iconName: 'TrendingUp' },
  warm: { label: 'Warm', class: 'badge-warm', iconName: 'Minus' },
  cold: { label: 'Cold', class: 'badge-cold', iconName: 'TrendingDown' },
};

// ── Org slug (matches seed data) ───────────────────────────────────────────
export const ORG_SLUG = 'ghar';
