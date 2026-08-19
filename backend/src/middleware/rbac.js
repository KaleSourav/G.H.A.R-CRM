/**
 * Role-Based Access Control middleware factory
 * Usage: router.get('/route', authenticate, requireRole(['admin','manager']), handler)
 */
const requireRole = (allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (!allowedRoles.includes(req.userRole)) {
    return res.status(403).json({
      error: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${req.userRole}`,
    });
  }
  next();
};

/**
 * Check if user can access a lead (admin/manager see all; executive sees assigned only)
 */
const canAccessLead = (lead, user) => {
  if (['admin', 'manager'].includes(user.role)) return true;
  if (user.role === 'executive' && lead.assigned_to === user.id) return true;
  if (user.role === 'front_office') return true;
  return false;
};

module.exports = { requireRole, canAccessLead };
