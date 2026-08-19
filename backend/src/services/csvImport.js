const { parse } = require('csv-parse');
const { supabaseAdmin } = require('../supabaseAdmin');
const { calculateLeadScore, scoreSource } = require('./leadScore');
const { autoAssignLead } = require('./autoAssign');

/**
 * CSV Import Service
 *
 * Expected CSV columns (case-insensitive, flexible):
 * name, phone, email, source, project, budget_min, budget_max,
 * configuration, location_pref, purpose, notes
 *
 * Deduplication: by phone number (primary) or email (secondary)
 * Duplicate leads are flagged, not rejected.
 */

const COLUMN_MAP = {
  name: ['name', 'full name', 'customer name', 'client name'],
  phone: ['phone', 'mobile', 'contact', 'phone number', 'mobile number'],
  email: ['email', 'email address', 'e-mail'],
  source: ['source', 'lead source'],
  sub_source: ['sub source', 'sub_source', 'campaign'],
  project: ['project', 'property', 'interested in'],
  budget_min: ['budget min', 'budget_min', 'min budget', 'budget from'],
  budget_max: ['budget max', 'budget_max', 'max budget', 'budget to', 'budget'],
  configuration: ['configuration', 'config', 'bhk', 'unit type'],
  location_pref: ['location', 'location preference', 'area preference'],
  purpose: ['purpose', 'requirement type'],
  notes: ['notes', 'remarks', 'comments'],
};

function normalizeHeader(header) {
  return header.trim().toLowerCase();
}

function mapColumns(headers) {
  const mapping = {};
  headers.forEach((header, index) => {
    const normalizedHeader = normalizeHeader(header);
    for (const [field, aliases] of Object.entries(COLUMN_MAP)) {
      if (aliases.includes(normalizedHeader)) {
        mapping[field] = index;
        break;
      }
    }
  });
  return mapping;
}

function cleanPhone(phone) {
  if (!phone) return null;
  // Remove spaces, dashes, +91, parentheses
  const cleaned = String(phone).replace(/[\s\-\(\)\+]/g, '').replace(/^91/, '');
  // Keep only digits
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return null;
}

function parseBudget(value) {
  if (!value) return null;
  const str = String(value).toLowerCase().replace(/[,\s₹]/g, '');
  // Handle lakhs (e.g., "50L", "50 lakh")
  const lakhMatch = str.match(/(\d+\.?\d*)\s*(?:l|lakh|lac)/);
  if (lakhMatch) return Math.round(parseFloat(lakhMatch[1]) * 100000);
  // Handle crores
  const croreMatch = str.match(/(\d+\.?\d*)\s*(?:cr|crore)/);
  if (croreMatch) return Math.round(parseFloat(croreMatch[1]) * 10000000);
  // Plain number
  const num = parseFloat(str);
  return isNaN(num) ? null : Math.round(num);
}

/**
 * Parse a CSV buffer and return structured lead objects
 * @param {Buffer} buffer - CSV file buffer
 * @param {object} orgInfo - { orgId, importedBy }
 * @returns {{ leads: array, errors: array, stats: object }}
 */
async function parseCSV(buffer, { orgId, importedBy }) {
  return new Promise((resolve, reject) => {
    const leads = [];
    const errors = [];
    let rowIndex = 0;
    let columnMap = null;

    parse(buffer, {
      trim: true,
      skip_empty_lines: true,
      relax_quotes: true,
    })
      .on('data', (row) => {
        if (rowIndex === 0) {
          // First row is header
          columnMap = mapColumns(row);
          rowIndex++;
          return;
        }

        rowIndex++;
        const get = (field) => {
          const idx = columnMap[field];
          return idx !== undefined ? row[idx]?.trim() || null : null;
        };

        const phone = cleanPhone(get('phone'));
        const name = get('name');

        if (!name) {
          errors.push({ row: rowIndex, error: 'Missing required field: name' });
          return;
        }
        if (!phone) {
          errors.push({ row: rowIndex, error: `Row ${rowIndex}: Missing or invalid phone number` });
          return;
        }

        leads.push({
          org_id: orgId,
          name,
          phone,
          email: get('email'),
          source: get('source') || 'CSV Import',
          sub_source: get('sub_source'),
          budget_min: parseBudget(get('budget_min')),
          budget_max: parseBudget(get('budget_max')),
          configuration: get('configuration'),
          location_pref: get('location_pref'),
          purpose: (['self_use','investment','rental'].includes(get('purpose'))) ? get('purpose') : 'not_specified',
          notes: get('notes'),
          stage: 'New / Unassigned',
          _raw_project: get('project'), // handle project matching separately
        });
      })
      .on('error', reject)
      .on('end', () => resolve({ leads, errors, rowIndex }));
  });
}

/**
 * Import CSV leads into the database
 * @param {Buffer} buffer - CSV file buffer
 * @param {object} options - { orgId, importedBy, autoAssign }
 * @returns {{ imported: number, duplicates: number, errors: array }}
 */
async function importCSV(buffer, { orgId, importedBy, autoAssign = true }) {
  const { leads, errors, rowIndex } = await parseCSV(buffer, { orgId, importedBy });

  if (!leads.length) {
    return { imported: 0, duplicates: 0, skipped: 0, errors, totalRows: rowIndex - 1 };
  }

  // Fetch existing phones + emails for dedup check
  const phones = leads.map(l => l.phone).filter(Boolean);
  const emails = leads.map(l => l.email).filter(Boolean);

  const { data: existingLeads } = await supabaseAdmin
    .from('leads')
    .select('id, phone, email')
    .eq('org_id', orgId)
    .or(`phone.in.(${phones.join(',')}),email.in.(${emails.filter(Boolean).join(',')})`);

  const existingPhones = new Set((existingLeads || []).map(l => l.phone));
  const existingEmails = new Set((existingLeads || []).map(l => l.email).filter(Boolean));
  const duplicateMap = Object.fromEntries((existingLeads || []).map(l => [l.phone, l.id]));

  let imported = 0;
  let duplicates = 0;

  // Process in batches of 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    const batch = leads.slice(i, i + BATCH_SIZE);
    const toInsert = [];

    for (const lead of batch) {
      const isDuplicate = existingPhones.has(lead.phone) || (lead.email && existingEmails.has(lead.email));
      const { _raw_project, ...leadData } = lead;

      const { score, priority } = calculateLeadScore(leadData, 0);

      toInsert.push({
        ...leadData,
        lead_score: score,
        priority,
        is_duplicate: isDuplicate,
        duplicate_of: isDuplicate ? (duplicateMap[lead.phone] || null) : null,
      });

      if (isDuplicate) duplicates++;
    }

    const { data: inserted, error } = await supabaseAdmin
      .from('leads')
      .insert(toInsert)
      .select('id, org_id, assigned_to, name');

    if (error) {
      errors.push({ batch: i, error: error.message });
      continue;
    }

    imported += (inserted?.length || 0);

    // Auto-assign inserted leads
    if (autoAssign && inserted?.length) {
      for (const lead of inserted) {
        if (!lead.assigned_to) {
          try {
            await autoAssignLead(lead.id, orgId, importedBy);
          } catch (assignErr) {
            console.warn(`[CSV Import] Auto-assign failed for lead ${lead.id}:`, assignErr.message);
          }
        }
      }
    }

    // Log import activity
    if (inserted?.length) {
      await supabaseAdmin.from('lead_activities').insert(
        inserted.map(lead => ({
          lead_id: lead.id,
          user_id: importedBy,
          org_id: orgId,
          type: 'csv_import',
          content: `Lead imported via CSV upload`,
          metadata: { imported_by: importedBy },
        }))
      );
    }
  }

  // Audit log
  await supabaseAdmin.from('audit_logs').insert({
    org_id: orgId,
    user_id: importedBy,
    action: 'leads.csv_import',
    entity_type: 'lead',
    entity_id: null,
    new_values: { imported, duplicates, errors: errors.length, totalRows: rowIndex - 1 },
  });

  return { imported, duplicates, errors, totalRows: rowIndex - 1 };
}

module.exports = { importCSV, parseCSV, cleanPhone, parseBudget };
