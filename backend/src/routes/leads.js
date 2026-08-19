const express = require('express');
const multer = require('multer');
const { body, query, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../supabaseAdmin');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { autoAssignLead, reassignLead } = require('../services/autoAssign');
const { importCSV } = require('../services/csvImport');
const { updateLeadScore, calculateLeadScore } = require('../services/leadScore');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// All routes require authentication
router.use(authenticate);

// ── GET /api/leads ─────────────────────────────────────────────────────────
// List leads with filtering, sorting, pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1, limit = 50,
      stage, source, priority, assigned_to, project_id,
      search, sla_breach, sort_by = 'created_at', sort_dir = 'desc',
      date_from, date_to,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { user, orgId, userRole } = req;

    let queryBuilder = supabaseAdmin
      .from('leads')
      .select(`
        *,
        project:projects(id, name, location),
        assignee:users!leads_assigned_to_fkey(id, name, avatar_url),
        task_count:tasks(count)
      `, { count: 'exact' })
      .eq('org_id', orgId);

    // Role-based filtering (mirrors RLS but applied at query level for speed)
    if (userRole === 'executive') {
      queryBuilder = queryBuilder.eq('assigned_to', user.id);
    }

    // Filters
    if (stage) queryBuilder = queryBuilder.eq('stage', stage);
    if (source) queryBuilder = queryBuilder.eq('source', source);
    if (priority) queryBuilder = queryBuilder.eq('priority', priority);
    if (assigned_to && userRole !== 'executive') {
      queryBuilder = queryBuilder.eq('assigned_to', assigned_to);
    }
    if (project_id) queryBuilder = queryBuilder.eq('project_id', project_id);
    if (sla_breach !== undefined) queryBuilder = queryBuilder.eq('sla_breach', sla_breach === 'true');
    if (date_from) queryBuilder = queryBuilder.gte('created_at', date_from);
    if (date_to) queryBuilder = queryBuilder.lte('created_at', date_to + 'T23:59:59Z');

    // Full-text search
    if (search) {
      queryBuilder = queryBuilder.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Sorting + pagination
    queryBuilder = queryBuilder
      .order(sort_by, { ascending: sort_dir === 'asc' })
      .range(offset, offset + parseInt(limit) - 1);

    const { data, error, count } = await queryBuilder;
    if (error) throw error;

    res.json({
      leads: data || [],
      pagination: {
        total: count || 0,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil((count || 0) / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('[GET /leads]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/leads/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .select(`
        *,
        project:projects(id, name, location, developer_name, rera_number),
        unit_interest:units(id, unit_number, tower, floor, configuration, price, status),
        assignee:users!leads_assigned_to_fkey(id, name, email, phone, avatar_url),
        activities:lead_activities(
          id, type, content, metadata, created_at,
          user:users(id, name, avatar_url)
        ),
        tasks(id, type, title, due_date, status, priority)
      `)
      .eq('id', req.params.id)
      .eq('org_id', req.orgId)
      .order('created_at', { foreignTable: 'lead_activities', ascending: false })
      .single();

    if (error || !lead) return res.status(404).json({ error: 'Lead not found' });

    // Executive can only see their own leads
    if (req.userRole === 'executive' && lead.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/leads ────────────────────────────────────────────────────────
router.post('/', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('source').optional().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const leadData = {
      ...req.body,
      org_id: req.orgId,
      stage: req.body.stage || 'New / Unassigned',
    };

    // Calculate initial lead score
    const { score, priority } = calculateLeadScore(leadData, 0);
    leadData.lead_score = score;
    leadData.priority = priority;

    // Duplicate detection
    const { data: existing } = await supabaseAdmin
      .from('leads')
      .select('id')
      .eq('org_id', req.orgId)
      .or(`phone.eq.${leadData.phone}${leadData.email ? `,email.eq.${leadData.email}` : ''}`)
      .limit(1);

    if (existing?.length) {
      leadData.is_duplicate = true;
      leadData.duplicate_of = existing[0].id;
    }

    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .insert(leadData)
      .select()
      .single();

    if (error) throw error;

    // Activity log
    await supabaseAdmin.from('lead_activities').insert({
      lead_id: lead.id, user_id: req.user.id, org_id: req.orgId,
      type: 'note', content: 'Lead created',
      metadata: { source: lead.source },
    });

    // Audit
    await supabaseAdmin.from('audit_logs').insert({
      org_id: req.orgId, user_id: req.user.id,
      action: 'lead.created', entity_type: 'lead', entity_id: lead.id,
      new_values: { name: lead.name, source: lead.source },
    });

    // Auto-assign if not manually assigned
    if (!lead.assigned_to) {
      await autoAssignLead(lead.id, req.orgId, req.user.id);
    }

    res.status(201).json(lead);
  } catch (err) {
    console.error('[POST /leads]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/leads/:id ─────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Get current state for audit
    const { data: current } = await supabaseAdmin
      .from('leads').select('*').eq('id', id).single();

    if (!current) return res.status(404).json({ error: 'Lead not found' });

    // Executive can only update their assigned leads
    if (req.userRole === 'executive' && current.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Track stage change
    const stageChanged = updates.stage && updates.stage !== current.stage;

    // Set first_contacted_at when moving from New to Contacted
    if (stageChanged && current.stage === 'New / Unassigned' && updates.stage === 'Contacted') {
      updates.first_contacted_at = new Date().toISOString();
      updates.sla_breach = false; // clear breach on contact
    }

    updates.last_activity_at = new Date().toISOString();

    const { data: lead, error } = await supabaseAdmin
      .from('leads').update(updates).eq('id', id).select().single();

    if (error) throw error;

    // Log stage change activity
    if (stageChanged) {
      await supabaseAdmin.from('lead_activities').insert({
        lead_id: id, user_id: req.user.id, org_id: req.orgId,
        type: 'stage_change',
        content: `Stage changed from "${current.stage}" to "${updates.stage}"`,
        metadata: { from_stage: current.stage, to_stage: updates.stage, lost_reason: updates.lost_reason },
      });
    }

    // Audit
    await supabaseAdmin.from('audit_logs').insert({
      org_id: req.orgId, user_id: req.user.id,
      action: 'lead.updated', entity_type: 'lead', entity_id: id,
      old_values: current, new_values: updates,
    });

    // Recalculate score if relevant fields changed
    if (updates.source || updates.budget_min || updates.budget_max) {
      await updateLeadScore(id);
    }

    res.json(lead);
  } catch (err) {
    console.error('[PUT /leads/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/leads/:id/reassign ───────────────────────────────────────────
router.post('/:id/reassign', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { to_user_id } = req.body;
    if (!to_user_id) return res.status(400).json({ error: 'to_user_id is required' });
    await reassignLead(req.params.id, to_user_id, req.user.id, req.orgId);
    res.json({ message: 'Lead reassigned successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/leads/:id/activity ───────────────────────────────────────────
// Log a note, call, email, etc. on a lead
router.post('/:id/activity', async (req, res) => {
  try {
    const { type, content, metadata } = req.body;
    if (!type || !content) return res.status(400).json({ error: 'type and content are required' });

    const { data, error } = await supabaseAdmin.from('lead_activities').insert({
      lead_id: req.params.id, user_id: req.user.id, org_id: req.orgId,
      type, content, metadata: metadata || {},
    }).select().single();

    if (error) throw error;

    // Update last_activity_at on lead
    await supabaseAdmin.from('leads')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', req.params.id);

    // Recalculate score after activity
    await updateLeadScore(req.params.id);

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/leads/import/csv ─────────────────────────────────────────────
router.post('/import/csv', requireRole(['admin', 'manager']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });

    const autoAssign = req.body.auto_assign !== 'false';
    const result = await importCSV(req.file.buffer, {
      orgId: req.orgId,
      importedBy: req.user.id,
      autoAssign,
    });

    // Notify the importer
    await supabaseAdmin.from('notifications').insert({
      org_id: req.orgId, user_id: req.user.id,
      type: 'csv_import_complete', title: 'CSV Import Complete',
      content: `Imported ${result.imported} leads (${result.duplicates} duplicates flagged, ${result.errors.length} errors)`,
    });

    res.json(result);
  } catch (err) {
    console.error('[CSV Import]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/leads/bulk ────────────────────────────────────────────────────
// Bulk actions: reassign, change stage, export
router.post('/bulk', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { action, lead_ids, payload } = req.body;
    if (!action || !lead_ids?.length) {
      return res.status(400).json({ error: 'action and lead_ids are required' });
    }

    switch (action) {
      case 'reassign': {
        if (!payload?.to_user_id) return res.status(400).json({ error: 'to_user_id required' });
        await Promise.all(lead_ids.map(id => reassignLead(id, payload.to_user_id, req.user.id, req.orgId)));
        return res.json({ message: `${lead_ids.length} leads reassigned` });
      }
      case 'change_stage': {
        if (!payload?.stage) return res.status(400).json({ error: 'stage required' });
        await supabaseAdmin.from('leads').update({ stage: payload.stage }).in('id', lead_ids);
        return res.json({ message: `${lead_ids.length} leads updated` });
      }
      case 'delete': {
        if (!['admin'].includes(req.userRole)) {
          return res.status(403).json({ error: 'Only admin can bulk delete' });
        }
        await supabaseAdmin.from('leads').delete().in('id', lead_ids);
        return res.json({ message: `${lead_ids.length} leads deleted` });
      }
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/leads/:id ──────────────────────────────────────────────────
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from('leads').delete().eq('id', req.params.id).eq('org_id', req.orgId);
    if (error) throw error;
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUBLIC: POST /api/capture ──────────────────────────────────────────────
// Web form lead capture — no auth required
const capturePublicLead = async (req, res) => {
  try {
    const { name, phone, email, source, project_id, budget_max, configuration, notes, org_slug } = req.body;

    if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });

    // Look up org by slug
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('slug', org_slug || 'ghar')
      .single();

    if (!org) return res.status(400).json({ error: 'Organization not found' });

    const leadData = {
      org_id: org.id, name, phone, email,
      source: source || 'Website Form', project_id: project_id || null,
      budget_max: budget_max ? parseInt(budget_max) : null,
      configuration, notes,
      stage: 'New / Unassigned',
    };

    // Dedup check
    const { data: existing } = await supabaseAdmin
      .from('leads').select('id').eq('org_id', org.id)
      .or(`phone.eq.${phone}${email ? `,email.eq.${email}` : ''}`).limit(1);

    if (existing?.length) {
      leadData.is_duplicate = true;
      leadData.duplicate_of = existing[0].id;
    }

    const { score, priority } = calculateLeadScore(leadData, 0);
    leadData.lead_score = score;
    leadData.priority = priority;

    const { data: lead, error } = await supabaseAdmin.from('leads').insert(leadData).select().single();
    if (error) throw error;

    // System activity log
    try {
      await supabaseAdmin.from('lead_activities').insert({
        lead_id: lead.id, user_id: null, org_id: org.id,
        type: 'note', content: `Lead submitted via website form`,
      });
    } catch (err) {
      console.warn('[Public Capture] Non-fatal error logging activity:', err.message);
    }

    // Auto-assign
    const systemUserId = (await supabaseAdmin.from('users').select('id').eq('org_id', org.id).eq('role', 'admin').limit(1).single()).data?.id;
    if (systemUserId) {
      await autoAssignLead(lead.id, org.id, systemUserId).catch(() => {});
    }

    res.status(201).json({ message: 'Thank you! We will contact you shortly.', id: lead.id });
  } catch (err) {
    console.error('[Public Capture]', err.message);
    res.status(500).json({ error: 'Failed to submit enquiry. Please try again.' });
  }
};

module.exports = router;
module.exports.capturePublicLead = capturePublicLead;
