-- =============================================================================
-- G.H.A.R CRM — Migration 004: Super Admin Role & Assignment Performance Indexes
-- Run this in Supabase SQL Editor
-- =============================================================================

-- 1. Update check constraint on users table to allow 'super_admin' and 'superadmin'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('super_admin', 'superadmin', 'admin', 'manager', 'executive', 'channel_partner', 'finance', 'front_office'));

-- 2. Add performance index on assigned_at and notifications for real-time assigned tab queries
CREATE INDEX IF NOT EXISTS idx_leads_assigned_at ON leads(assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type_user ON notifications(user_id, type, read_status);
