const express = require('express');
const { supabaseAdmin } = require('../supabaseAdmin');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
router.use(authenticate);

// GET /api/tasks
router.get('/', async (req, res) => {
  try {
    const { status, type, due_from, due_to, lead_id } = req.query;
    const { user, orgId, userRole } = req;

    let q = supabaseAdmin
      .from('tasks')
      .select(`*, lead:leads(id, name, phone, stage), assignee:users!tasks_user_id_fkey(id, name, avatar_url)`, { count: 'exact' })
      .eq('org_id', orgId);

    if (userRole === 'executive') q = q.eq('user_id', user.id);
    if (status) q = q.eq('status', status);
    if (type) q = q.eq('type', type);
    if (lead_id) q = q.eq('lead_id', lead_id);
    if (due_from) q = q.gte('due_date', due_from);
    if (due_to) q = q.lte('due_date', due_to + 'T23:59:59Z');

    q = q.order('due_date', { ascending: true });

    const { data, error, count } = await q;
    if (error) throw error;
    res.json({ tasks: data || [], total: count || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks
router.post('/', async (req, res) => {
  try {
    const { title, type, due_date, lead_id, description, priority, user_id } = req.body;
    if (!title || !type || !due_date) {
      return res.status(400).json({ error: 'title, type, and due_date are required' });
    }

    // Managers/admins can create tasks for other users; executives create for themselves
    const assignedUserId = (['admin','manager'].includes(req.userRole) && user_id) ? user_id : req.user.id;

    const { data, error } = await supabaseAdmin.from('tasks').insert({
      org_id: req.orgId, user_id: assignedUserId, lead_id: lead_id || null,
      title, type, due_date, description, priority: priority || 'medium',
      status: 'pending', created_by: req.user.id,
    }).select().single();

    if (error) throw error;

    // If tied to a lead, log activity
    if (lead_id) {
      await supabaseAdmin.from('lead_activities').insert({
        lead_id, user_id: req.user.id, org_id: req.orgId,
        type: 'task_created',
        content: `Task created: ${title} (due ${new Date(due_date).toLocaleDateString('en-IN')})`,
        metadata: { task_id: data.id, task_type: type },
      });
    }

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tasks/:id
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    if (updates.status === 'completed' && !updates.completed_at) {
      updates.completed_at = new Date().toISOString();
    }
    const { data, error } = await supabaseAdmin
      .from('tasks').update(updates).eq('id', req.params.id).eq('org_id', req.orgId).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    await supabaseAdmin.from('tasks').delete().eq('id', req.params.id).eq('org_id', req.orgId);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks/overdue-check — mark overdue tasks (called by cron or manually)
router.post('/overdue-check', requireRole(['admin']), async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('tasks')
      .update({ status: 'overdue' })
      .eq('org_id', req.orgId)
      .eq('status', 'pending')
      .lt('due_date', new Date().toISOString());
    if (error) throw error;
    res.json({ message: 'Overdue tasks updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
