const FOUNDER_EMAILS = ['admin@ghar.in', 'sourav@ghar.in'];

/**
 * Check if a user is a Super Admin (Founders or users explicitly assigned super_admin role)
 */
const isSuperAdmin = (user) => {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  const email = (user.email || '').toLowerCase();
  return role === 'super_admin' || role === 'superadmin' || FOUNDER_EMAILS.includes(email);
};

/**
 * Super Admin strict middleware: restricts routes exclusively to Super Admins (Founders)
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (!isSuperAdmin(req.user)) {
    return res.status(403).json({
      error: 'Access denied. Super Admin privileges required. Only founders can perform this action.',
    });
  }
  next();
};

/**
 * Role-Based Access Control middleware factory
 * Super Admins inherit all permissions granted to admin, manager, executive.
 */
const requireRole = (allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Super Admins automatically qualify for admin, manager, executive routes
  if (isSuperAdmin(req.user)) {
    return next();
  }

  if (!allowedRoles.includes(req.userRole)) {
    return res.status(403).json({
      error: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${req.userRole}`,
    });
  }
  next();
};

/**
 * Check if user can access a lead (super_admin/admin/manager see all; executive sees assigned only)
 */
const canAccessLead = (lead, user) => {
  if (!user) return false;
  if (isSuperAdmin(user) || ['admin', 'manager'].includes(user.role)) return true;
  if (user.role === 'executive' && lead.assigned_to === user.id) return true;
  if (user.role === 'front_office') return true;
  return false;
};

module.exports = { isSuperAdmin, requireSuperAdmin, requireRole, canAccessLead, FOUNDER_EMAILS };

