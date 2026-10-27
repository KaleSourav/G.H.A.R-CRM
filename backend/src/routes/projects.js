const express = require('express');
const { supabaseAdmin } = require('../supabaseAdmin');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
router.use(authenticate);

// GET /api/projects
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let q = supabaseAdmin
      .from('projects')
      .select('*, leads(count)')
      .eq('org_id', req.orgId);
    if (status) q = q.eq('status', status);
    q = q.order('created_at', { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    // Flatten lead count into each project
    const projects = (data || []).map(p => ({
      ...p,
      lead_count: p.leads?.[0]?.count ?? 0,
      leads: undefined,
    }));
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select(`*, units(*)`)
      .eq('id', req.params.id)
      .eq('org_id', req.orgId)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Project not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const ALLOWED_PROJECT_COLUMNS = [
  'org_id', 'name', 'developer_name', 'location', 'location_lat', 'location_lng',
  'rera_number', 'launch_date', 'possession_date', 'amenities', 'brochure_url',
  'status', 'total_units', 'available_units', 'price_min', 'price_max'
];

function sanitizeProjectPayload(input) {
  if (!input || typeof input !== 'object') return {};
  const data = { ...input };

  // Map mobile property 'developer' -> DB column 'developer_name'
  if (data.developer && !data.developer_name) {
    data.developer_name = data.developer;
  }

  // Normalize status to lowercase enum
  if (data.status) {
    const s = String(data.status).toLowerCase();
    data.status = ['active', 'upcoming', 'completed', 'archived'].includes(s) ? s : 'active';
  }

  // Parse numeric totals and price limits
  if (data.price_min !== undefined) {
    const num = typeof data.price_min === 'number' ? data.price_min : Number(String(data.price_min).replace(/\D/g, ''));
    data.price_min = !isNaN(num) && num > 0 ? num : null;
  }
  if (data.price_max !== undefined) {
    const num = typeof data.price_max === 'number' ? data.price_max : Number(String(data.price_max).replace(/\D/g, ''));
    data.price_max = !isNaN(num) && num > 0 ? num : null;
  }
  if (data.total_units !== undefined) {
    data.total_units = parseInt(data.total_units) || 0;
  }
  if (data.available_units !== undefined) {
    data.available_units = parseInt(data.available_units) || 0;
  }

  const sanitized = {};
  for (const col of ALLOWED_PROJECT_COLUMNS) {
    if (data[col] !== undefined) {
      sanitized[col] = data[col];
    }
  }
  return sanitized;
}

// POST /api/projects
router.post('/', requireRole(['admin', 'manager', 'super_admin']), async (req, res) => {
  try {
    const projectData = sanitizeProjectPayload(req.body);
    projectData.org_id = req.orgId;

    const { data, error } = await supabaseAdmin
      .from('projects').insert(projectData).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:id
router.put('/:id', requireRole(['admin', 'manager', 'super_admin']), async (req, res) => {
  try {
    const updates = sanitizeProjectPayload(req.body);
    const { data, error } = await supabaseAdmin
      .from('projects').update(updates).eq('id', req.params.id).eq('org_id', req.orgId).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id/units
router.get('/:id/units', async (req, res) => {
  try {
    const { status } = req.query;
    let q = supabaseAdmin.from('units').select('*').eq('project_id', req.params.id);
    if (status) q = q.eq('status', status);
    q = q.order('floor').order('unit_number');
    const { data, error } = await q;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/units
router.post('/:id/units', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('units').insert({ ...req.body, project_id: req.params.id }).select().single();
    if (error) throw error;
    // Update available_units count on project
    const { count } = await supabaseAdmin.from('units')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', req.params.id).eq('status', 'available');
    await supabaseAdmin.from('projects').update({ available_units: count || 0 }).eq('id', req.params.id);
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:projectId/units/:unitId
router.put('/:projectId/units/:unitId', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('units').update(req.body).eq('id', req.params.unitId).eq('project_id', req.params.projectId).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
