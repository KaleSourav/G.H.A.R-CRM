const express = require('express');
const { supabaseAdmin } = require('../supabaseAdmin');
const { authenticate } = require('../middleware/auth');
const { requireRole, requireSuperAdmin, isSuperAdmin } = require('../middleware/rbac');

const router = express.Router();
router.use(authenticate);

// GET /api/team — list team members (accessible by all team members to allow lead assignment)
router.get('/', requireRole(['admin', 'manager', 'executive', 'super_admin']), async (req, res) => {
  try {
    let q = supabaseAdmin
      .from('users')
      .select('id, name, email, phone, role, status, avatar_url, current_lead_count, last_assigned_at, manager_id')
      .eq('org_id', req.orgId)
      .order('role').order('name');

    // Managers only see their team; executives and admins see all active members to allow assignment
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

// POST /api/team — create user (Super Admin only — standard admin cannot create users/roles)
// Note: This creates both the Supabase Auth user and the users table record
router.post('/', requireSuperAdmin, async (req, res) => {
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
    let insertRole = role;
    let { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id, org_id: req.orgId,
        name, email, phone, role: insertRole, manager_id: manager_id || null, status: 'active',
      })
      .select().single();

    // Fallback if DB constraint hasn't been updated with migration 004 yet
    if (profileError && profileError.code === '23514' && (insertRole === 'super_admin' || insertRole === 'superadmin')) {
      console.warn('[Team Route] DB check constraint requires migration 004. Falling back to role=admin.');
      const retry = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id, org_id: req.orgId,
          name, email, phone, role: 'admin', manager_id: manager_id || null, status: 'active',
        })
        .select().single();
      profile = retry.data;
      profileError = retry.error;
    }

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

// PUT /api/team/:id (Super Admin only — standard admin cannot edit users/roles)
router.put('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { name, phone, role, manager_id, status } = req.body;
    let updateData = { name, phone, role, manager_id, status };

    let { data, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', req.params.id).eq('org_id', req.orgId)
      .select().single();

    if (error && error.code === '23514' && (role === 'super_admin' || role === 'superadmin')) {
      // Fallback if DB check constraint not updated yet
      updateData.role = 'admin';
      const retry = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', req.params.id).eq('org_id', req.orgId)
        .select().single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/team/:id (Super Admin only — standard admin cannot deactivate users)
router.delete('/:id', requireSuperAdmin, async (req, res) => {
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

