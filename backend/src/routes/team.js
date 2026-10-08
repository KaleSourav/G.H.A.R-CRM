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

    // Managers only see their team; executives and admins see all members to allow assignment
    if (req.userRole === 'manager') {
      q = q.or(`id.eq.${req.user.id},manager_id.eq.${req.user.id}`);
    }

    const { data: users, error } = await q;
    if (error) throw error;

    // Fetch auth users to sync super_admin status from user_metadata
    let authUsersMap = {};
    try {
      const { data: authList } = await supabaseAdmin.auth.admin.listUsers();
      if (authList?.users) {
        authList.users.forEach(au => {
          authUsersMap[au.id] = au.user_metadata || {};
          if (au.email) authUsersMap[au.email.toLowerCase()] = au.user_metadata || {};
        });
      }
    } catch (e) {
      console.warn('[Team GET] Failed to list auth users:', e.message);
    }

    const FOUNDER_EMAILS = ['admin@ghar.in', 'sourav@ghar.in'];

    const enrichedUsers = (users || []).map(u => {
      const emailLower = (u.email || '').toLowerCase();
      const meta = authUsersMap[u.id] || authUsersMap[emailLower] || {};
      const isSuper = (
        u.role === 'super_admin' ||
        u.role === 'superadmin' ||
        meta.role === 'super_admin' ||
        meta.role === 'superadmin' ||
        meta.is_super_admin === true ||
        FOUNDER_EMAILS.includes(emailLower)
      );

      return {
        ...u,
        role: isSuper ? 'super_admin' : u.role,
        is_super_admin: isSuper,
      };
    });

    res.json(enrichedUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/team — create user (Admin & Super Admin can create any user role)
router.post('/', requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { name, email, phone, role, manager_id, password } = req.body;
    if (!name || !email || !role || !password) {
      return res.status(400).json({ error: 'name, email, role, and password are required' });
    }

    const isSuper = role === 'super_admin' || role === 'superadmin';

    // 1. Create auth user with metadata preserving super_admin status
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: isSuper ? 'super_admin' : role,
        is_super_admin: isSuper,
      },
    });

    if (authError) throw new Error(`Auth creation failed: ${authError.message}`);

    // 2. Create user profile in users table
    let insertRole = isSuper ? 'super_admin' : role;
    let { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        org_id: req.orgId,
        name,
        email,
        phone,
        role: insertRole,
        manager_id: manager_id || null,
        status: 'active',
      })
      .select().single();

    // Fallback if DB constraint hasn't been updated with migration 004 yet
    if (profileError && profileError.code === '23514' && isSuper) {
      console.warn('[Team Route] DB check constraint requires migration 004. Storing role=admin in DB with super_admin in auth metadata.');
      const retry = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          org_id: req.orgId,
          name,
          email,
          phone,
          role: 'admin',
          manager_id: manager_id || null,
          status: 'active',
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

    if (isSuper && profile) {
      profile.role = 'super_admin';
      profile.is_super_admin = true;
    }

    res.status(201).json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/team/:id — update user profile / role / status (Admin & Super Admin)
router.put('/:id', requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { name, phone, role, manager_id, status } = req.body;
    const isSuper = role === 'super_admin' || role === 'superadmin';

    // Update auth metadata if role or status is supplied
    if (role) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(req.params.id, {
          user_metadata: {
            role: isSuper ? 'super_admin' : role,
            is_super_admin: isSuper,
          },
        });
      } catch (authErr) {
        console.warn('[Team Route] Could not update auth user metadata:', authErr.message);
      }
    }

    let updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (manager_id !== undefined) updateData.manager_id = manager_id || null;
    if (status !== undefined) updateData.status = status;
    if (role !== undefined) updateData.role = isSuper ? 'super_admin' : role;

    let { data, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', req.params.id).eq('org_id', req.orgId)
      .select().single();

    if (error && error.code === '23514' && isSuper) {
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

    if (isSuper && data) {
      data.role = 'super_admin';
      data.is_super_admin = true;
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/team/:id — deactivate user (Admin & Super Admin)
router.delete('/:id', requireRole(['admin', 'super_admin']), async (req, res) => {
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

