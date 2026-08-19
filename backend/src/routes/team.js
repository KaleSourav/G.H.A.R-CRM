const express = require('express');
const { supabaseAdmin } = require('../supabaseAdmin');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
router.use(authenticate);

// GET /api/team — list team members
router.get('/', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    let q = supabaseAdmin
      .from('users')
      .select('id, name, email, phone, role, status, avatar_url, current_lead_count, last_assigned_at, manager:users!users_manager_id_fkey(id, name)')
      .eq('org_id', req.orgId)
      .order('role').order('name');

    // Managers only see their team
    if (req.userRole === 'manager') {
      q = q.or(`id.eq.${req.user.id},manager_id.eq.${req.user.id}`);
    }

    const { data, error } = await q;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/team — create user (admin only)
// Note: This creates both the Supabase Auth user and the users table record
router.post('/', requireRole(['admin']), async (req, res) => {
  try {
    const { name, email, phone, role, manager_id, password } = req.body;
    if (!name || !email || !role || !password) {
      return res.status(400).json({ error: 'name, email, role, and password are required' });
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
    });

    if (authError) throw new Error(`Auth creation failed: ${authError.message}`);

    // Create user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id, org_id: req.orgId,
        name, email, phone, role, manager_id: manager_id || null, status: 'active',
      })
      .select().single();

    if (profileError) {
      // Rollback auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    res.status(201).json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/team/:id
router.put('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { name, phone, role, manager_id, status } = req.body;
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ name, phone, role, manager_id, status })
      .eq('id', req.params.id).eq('org_id', req.orgId)
      .select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/team/:id
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    // Deactivate instead of delete to preserve audit trail
    await supabaseAdmin.from('users')
      .update({ status: 'inactive' }).eq('id', req.params.id).eq('org_id', req.orgId);
    res.json({ message: 'User deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
