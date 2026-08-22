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

// POST /api/projects
router.post('/', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('projects').insert({ ...req.body, org_id: req.orgId }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:id
router.put('/:id', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('projects').update(req.body).eq('id', req.params.id).eq('org_id', req.orgId).select().single();
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
