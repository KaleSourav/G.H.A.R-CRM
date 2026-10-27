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
  'New / Unassigned':     { color: '#64748B', short: 'New' },
  'Contacted':            { color: '#3B82F6', short: 'Contacted' },
  'Qualified':            { color: '#4F6FE8', short: 'Qualified' },
  'Site Visit Scheduled': { color: '#F59E0B', short: 'SV Sched.' },
  'Site Visit Done':      { color: '#EC4899', short: 'SV Done' },
  'Negotiation':          { color: '#8B5CF6', short: 'Negotiation' },
  'Booking':              { color: '#E8A020', short: 'Booking' },
  'Sold / Closed Won':    { color: '#22C55E', short: 'Sold' },
  'Lost / Dropped':       { color: '#EF4444', short: 'Lost' },
  'On Hold / Nurture':    { color: '#475569', short: 'On Hold' },
};

export const LOST_REASONS = [
  'Budget mismatch', 'Location mismatch', 'Competitor',
  'Unresponsive', 'Not genuine', 'Property not available',
  'Delayed decision', 'Other',
];

export const LEAD_SOURCES = [
  'Website Form', 'Facebook Ad', 'Instagram Ad', 'Google Ad',
  '99acres', 'MagicBricks', 'Housing.com', 'NoBroker',
  'Walk-in', 'Referral - Client', 'Referral - Channel Partner',
  'WhatsApp Inbound', 'Inbound Call', 'Missed Call', 'Manual Entry', 'CSV Import',
];

export const CONFIGURATIONS = [
  '1BHK', '2BHK', '3BHK', '4BHK', '5BHK',
  'Villa', 'Plot', 'Studio', 'Commercial',
];

export const PURPOSES = [
  { value: 'self_use', label: 'Self Use' },
  { value: 'investment', label: 'Investment' },
  { value: 'rental', label: 'Rental' },
  { value: 'not_specified', label: 'Not Specified' },
];

export const TASK_TYPES = [
  { value: 'call', label: 'Call', icon: 'call-outline' },
  { value: 'follow_up', label: 'Follow Up', icon: 'notifications-outline' },
  { value: 'site_visit', label: 'Site Visit', icon: 'business-outline' },
  { value: 'document', label: 'Document', icon: 'document-text-outline' },
  { value: 'email', label: 'Email', icon: 'mail-outline' },
  { value: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

export const PRIORITY_CONFIG = {
  hot:  { label: 'Hot',  color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.25)', icon: 'flame' },
  warm: { label: 'Warm', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)', icon: 'sunny-outline' },
  cold: { label: 'Cold', color: '#64748B', bg: 'rgba(100, 116, 139, 0.12)', border: 'rgba(100, 116, 139, 0.25)', icon: 'snow-outline' },
};

export const ACTIVITY_TYPE_CONFIG = {
  note:                 { label: 'Note', icon: 'document-text-outline', color: '#94A3B8' },
  call:                 { label: 'Call', icon: 'call-outline', color: '#3B82F6' },
  email:                { label: 'Email', icon: 'mail-outline', color: '#4F6FE8' },
  whatsapp:             { label: 'WhatsApp', icon: 'logo-whatsapp', color: '#22C55E' },
  sms:                  { label: 'SMS', icon: 'chatbubble-ellipses-outline', color: '#94A3B8' },
  stage_change:         { label: 'Stage Changed', icon: 'repeat-outline', color: '#E8A020' },
  assignment:           { label: 'Reassigned', icon: 'person-add-outline', color: '#8B5CF6' },
  task_created:         { label: 'Task Created', icon: 'checkmark-circle-outline', color: '#EC4899' },
  site_visit_scheduled: { label: 'Site Visit Scheduled', icon: 'calendar-outline', color: '#F59E0B' },
  site_visit_done:      { label: 'Site Visit Completed', icon: 'checkmark-done-circle-outline', color: '#22C55E' },
};

export const ROLES = [
  { value: 'super_admin', label: 'Super Admin (Founder)' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Sales Manager' },
  { value: 'executive', label: 'Sales Executive' },
  { value: 'front_office', label: 'Front Office' },
  { value: 'finance', label: 'Finance' },
  { value: 'channel_partner', label: 'Channel Partner' },
];
