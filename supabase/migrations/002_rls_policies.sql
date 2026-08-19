-- =============================================================================
-- G.H.A.R CRM — Row-Level Security Policies
-- Migration: 002_rls_policies.sql
-- Run AFTER 001_core_schema.sql
-- =============================================================================

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Returns the current user's role from the users table
-- Used in RLS policies instead of JWT claims (single source of truth)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Returns the current user's org_id
CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Returns the current user's manager_id
CREATE OR REPLACE FUNCTION get_my_manager_id()
RETURNS UUID AS $$
  SELECT manager_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Returns IDs of all executives reporting to current manager
CREATE OR REPLACE FUNCTION get_my_team_ids()
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(id) FROM users WHERE manager_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- =============================================================================
-- ENABLE RLS ON ALL TABLES
-- =============================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- ORGANIZATIONS
-- =============================================================================
-- Users can only see their own org
CREATE POLICY "org_select_own" ON organizations
  FOR SELECT USING (id = get_my_org_id());

-- Only admin can update org settings
CREATE POLICY "org_update_admin" ON organizations
  FOR UPDATE USING (id = get_my_org_id() AND get_my_role() = 'admin');

-- =============================================================================
-- USERS
-- =============================================================================
-- Admin: see all users in org
CREATE POLICY "users_select_admin" ON users
  FOR SELECT USING (org_id = get_my_org_id() AND get_my_role() = 'admin');

-- Manager: see themselves + their team
CREATE POLICY "users_select_manager" ON users
  FOR SELECT USING (
    org_id = get_my_org_id() AND
    get_my_role() = 'manager' AND
    (id = auth.uid() OR manager_id = auth.uid())
  );

-- Executive: see only themselves + their manager
CREATE POLICY "users_select_executive" ON users
  FOR SELECT USING (
    org_id = get_my_org_id() AND
    get_my_role() = 'executive' AND
    (id = auth.uid() OR id = get_my_manager_id())
  );

-- Only admin can insert/update/delete users
CREATE POLICY "users_insert_admin" ON users
  FOR INSERT WITH CHECK (org_id = get_my_org_id() AND get_my_role() = 'admin');

CREATE POLICY "users_update_admin" ON users
  FOR UPDATE USING (org_id = get_my_org_id() AND get_my_role() = 'admin');

CREATE POLICY "users_update_self" ON users
  FOR UPDATE USING (id = auth.uid()); -- users can update their own profile

CREATE POLICY "users_delete_admin" ON users
  FOR DELETE USING (org_id = get_my_org_id() AND get_my_role() = 'admin');

-- =============================================================================
-- LEADS
-- =============================================================================
-- Admin: see ALL leads in org
CREATE POLICY "leads_select_admin" ON leads
  FOR SELECT USING (org_id = get_my_org_id() AND get_my_role() = 'admin');

-- Manager: see ALL leads in org (managers need full pipeline visibility)
CREATE POLICY "leads_select_manager" ON leads
  FOR SELECT USING (org_id = get_my_org_id() AND get_my_role() = 'manager');

-- Executive: see only their assigned leads
CREATE POLICY "leads_select_executive" ON leads
  FOR SELECT USING (
    org_id = get_my_org_id() AND
    get_my_role() = 'executive' AND
    assigned_to = auth.uid()
  );

-- Front office: can see all leads they created + unassigned
CREATE POLICY "leads_select_front_office" ON leads
  FOR SELECT USING (
    org_id = get_my_org_id() AND
    get_my_role() = 'front_office'
  );

-- Insert: any authenticated org member can create leads
CREATE POLICY "leads_insert_any" ON leads
  FOR INSERT WITH CHECK (org_id = get_my_org_id());

-- Update: admin + manager can update any lead; executive can only update their assigned leads
CREATE POLICY "leads_update_admin_manager" ON leads
  FOR UPDATE USING (
    org_id = get_my_org_id() AND
    get_my_role() IN ('admin', 'manager')
  );

CREATE POLICY "leads_update_executive_own" ON leads
  FOR UPDATE USING (
    org_id = get_my_org_id() AND
    get_my_role() = 'executive' AND
    assigned_to = auth.uid()
  );

-- Delete: admin only
CREATE POLICY "leads_delete_admin" ON leads
  FOR DELETE USING (org_id = get_my_org_id() AND get_my_role() = 'admin');

-- =============================================================================
-- LEAD ACTIVITIES
-- =============================================================================
-- Select: same rules as leads (activity follows lead visibility)
CREATE POLICY "lead_activities_select_admin_manager" ON lead_activities
  FOR SELECT USING (
    org_id = get_my_org_id() AND get_my_role() IN ('admin', 'manager', 'front_office')
  );

CREATE POLICY "lead_activities_select_executive" ON lead_activities
  FOR SELECT USING (
    org_id = get_my_org_id() AND
    get_my_role() = 'executive' AND
    user_id = auth.uid()
  );

-- Insert: any org member can log an activity on leads they can see
CREATE POLICY "lead_activities_insert_any" ON lead_activities
  FOR INSERT WITH CHECK (org_id = get_my_org_id());

-- =============================================================================
-- PROJECTS
-- =============================================================================
-- All org members can see projects
CREATE POLICY "projects_select_all" ON projects
  FOR SELECT USING (org_id = get_my_org_id());

-- Only admin + manager can write projects
CREATE POLICY "projects_write_admin_manager" ON projects
  FOR ALL USING (org_id = get_my_org_id() AND get_my_role() IN ('admin', 'manager'));

-- =============================================================================
-- UNITS
-- =============================================================================
-- All org members can see units (for inventory awareness)
CREATE POLICY "units_select_all" ON units
  FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE org_id = get_my_org_id())
  );

-- Admin + manager can write units
CREATE POLICY "units_write_admin_manager" ON units
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE org_id = get_my_org_id()) AND
    get_my_role() IN ('admin', 'manager')
  );

-- =============================================================================
-- TASKS
-- =============================================================================
-- Admin + manager: see all tasks in org
CREATE POLICY "tasks_select_admin_manager" ON tasks
  FOR SELECT USING (
    org_id = get_my_org_id() AND get_my_role() IN ('admin', 'manager')
  );

-- Executive: see only their own tasks
CREATE POLICY "tasks_select_executive" ON tasks
  FOR SELECT USING (
    org_id = get_my_org_id() AND
    get_my_role() = 'executive' AND
    user_id = auth.uid()
  );

-- Any org member can create tasks (for leads they can see)
CREATE POLICY "tasks_insert_any" ON tasks
  FOR INSERT WITH CHECK (org_id = get_my_org_id());

-- Update: admin + manager can update any; others update their own
CREATE POLICY "tasks_update_admin_manager" ON tasks
  FOR UPDATE USING (
    org_id = get_my_org_id() AND get_my_role() IN ('admin', 'manager')
  );

CREATE POLICY "tasks_update_own" ON tasks
  FOR UPDATE USING (
    org_id = get_my_org_id() AND user_id = auth.uid()
  );

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================
-- Users see only their own notifications
CREATE POLICY "notifications_own" ON notifications
  FOR ALL USING (user_id = auth.uid());

-- =============================================================================
-- AUDIT LOGS
-- =============================================================================
-- Admin + manager: read-only access to all audit logs in org
CREATE POLICY "audit_logs_read_admin_manager" ON audit_logs
  FOR SELECT USING (
    org_id = get_my_org_id() AND get_my_role() IN ('admin', 'manager')
  );

-- System/backend inserts via service_role (bypasses RLS)

-- =============================================================================
-- DOCUMENTS
-- =============================================================================
-- All org members can see documents
CREATE POLICY "documents_select_all" ON documents
  FOR SELECT USING (org_id = get_my_org_id());

-- Any org member can upload
CREATE POLICY "documents_insert_any" ON documents
  FOR INSERT WITH CHECK (org_id = get_my_org_id());

-- Admin can delete
CREATE POLICY "documents_delete_admin" ON documents
  FOR DELETE USING (org_id = get_my_org_id() AND get_my_role() = 'admin');

-- =============================================================================
-- PHASE 2 TABLES — Minimal RLS (admin/manager only for now)
-- =============================================================================
CREATE POLICY "channel_partners_all" ON channel_partners
  FOR ALL USING (org_id = get_my_org_id() AND get_my_role() IN ('admin', 'manager'));

CREATE POLICY "commission_ledger_all" ON commission_ledger
  FOR ALL USING (org_id = get_my_org_id() AND get_my_role() IN ('admin', 'manager', 'finance'));

CREATE POLICY "clients_all" ON clients
  FOR ALL USING (org_id = get_my_org_id() AND get_my_role() IN ('admin', 'manager', 'finance'));

CREATE POLICY "payment_schedules_all" ON payment_schedules
  FOR ALL USING (org_id = get_my_org_id() AND get_my_role() IN ('admin', 'manager', 'finance'));
