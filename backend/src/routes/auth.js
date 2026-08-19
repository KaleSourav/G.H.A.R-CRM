const express = require('express');
const { supabaseAdmin } = require('../supabaseAdmin');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/auth/me — get current user profile
router.get('/me', authenticate, async (req, res) => {
  res.json(req.user);
});

// GET /api/auth/notifications — user's notifications
router.get('/notifications', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/notifications/read-all
router.put('/notifications/read-all', authenticate, async (req, res) => {
  try {
    await supabaseAdmin.from('notifications')
      .update({ read_status: true }).eq('user_id', req.user.id).eq('read_status', false);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/notifications/:id/read
router.put('/notifications/:id/read', authenticate, async (req, res) => {
  try {
    await supabaseAdmin.from('notifications')
      .update({ read_status: true }).eq('id', req.params.id).eq('user_id', req.user.id);
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/org/settings
router.get('/org/settings', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('organizations').select('settings, name, slug').eq('id', req.orgId).single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
