-- =============================================================================
-- G.H.A.R CRM — Core Schema Migration
-- Migration: 001_core_schema.sql
-- Run this FIRST in Supabase SQL Editor
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy text search on leads

-- =============================================================================
-- ORGANIZATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  domain      TEXT,
  slug        TEXT UNIQUE NOT NULL,
  settings    JSONB DEFAULT '{
    "sla_hours": 0.5,
    "assignment_mode": "round_robin",
    "pipeline_stages": [
      "New / Unassigned",
      "Contacted",
      "Qualified",
      "Site Visit Scheduled",
      "Site Visit Done",
      "Negotiation",
      "Booking",
      "Sold / Closed Won",
      "Lost / Dropped",
      "On Hold / Nurture"
    ],
    "lost_reasons": [
      "Budget mismatch",
      "Location mismatch",
      "Competitor",
      "Unresponsive",
      "Not genuine",
      "Property not available",
      "Delayed decision",
      "Other"
    ],
    "lead_sources": [
      "Website Form",
      "Facebook Ad",
      "Instagram Ad",
      "Google Ad",
      "99acres",
      "MagicBricks",
      "Housing.com",
      "NoBroker",
      "Walk-in",
      "Referral - Client",
      "Referral - Channel Partner",
      "WhatsApp Inbound",
      "Inbound Call",
      "Missed Call",
      "Manual Entry",
      "CSV Import"
    ]
  }'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- USERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'executive', 'channel_partner', 'finance', 'front_office')),
  manager_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  avatar_url  TEXT,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  -- Round-robin assignment pointer (used by autoAssign service)
  last_assigned_at TIMESTAMPTZ,
  current_lead_count INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);

-- =============================================================================
-- PROJECTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS projects (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  developer_name   TEXT,
  location         TEXT,
  location_lat     DECIMAL(10,8),
  location_lng     DECIMAL(11,8),
  rera_number      TEXT,
  launch_date      DATE,
  possession_date  DATE,
  amenities        TEXT[],
  brochure_url     TEXT,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'upcoming', 'completed', 'archived')),
  total_units      INT DEFAULT 0,
  available_units  INT DEFAULT 0,
  price_min        BIGINT,   -- in INR paise
  price_max        BIGINT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_org_id ON projects(org_id);

-- =============================================================================
-- UNITS (Inventory)
-- =============================================================================
CREATE TABLE IF NOT EXISTS units (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tower         TEXT,
  floor         INT,
  unit_number   TEXT NOT NULL,
  configuration TEXT NOT NULL CHECK (configuration IN ('1BHK','2BHK','3BHK','4BHK','5BHK','Villa','Plot','Studio','Commercial')),
  area_sqft     DECIMAL(10,2),
  facing        TEXT,
  price         BIGINT NOT NULL,   -- in INR
  status        TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','held','booked','sold')),
  held_until    TIMESTAMPTZ,       -- auto-release timer for "held" status
  lead_id       UUID,              -- linked lead (set on booking)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_units_project_id ON units(project_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);

-- =============================================================================
-- LEADS
-- =============================================================================
CREATE TABLE IF NOT EXISTS leads (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Contact info
  name              TEXT NOT NULL,
  phone             TEXT NOT NULL,
  email             TEXT,
  alternate_phone   TEXT,
  alternate_email   TEXT,

  -- Source
  source            TEXT NOT NULL DEFAULT 'Manual Entry',
  sub_source        TEXT,                   -- e.g., "Facebook — Project X Campaign"

  -- Interest
  project_id        UUID REFERENCES projects(id) ON DELETE SET NULL,
  unit_interest_id  UUID REFERENCES units(id) ON DELETE SET NULL,
  budget_min        BIGINT,                  -- INR
  budget_max        BIGINT,
  configuration     TEXT,                   -- 1BHK/2BHK/etc
  location_pref     TEXT,
  purpose           TEXT CHECK (purpose IN ('self_use','investment','rental','not_specified')) DEFAULT 'not_specified',

  -- Pipeline
  stage             TEXT NOT NULL DEFAULT 'New / Unassigned',
  lost_reason       TEXT,
  priority          TEXT NOT NULL DEFAULT 'warm' CHECK (priority IN ('hot','warm','cold')),
  lead_score        INT NOT NULL DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),

  -- Assignment
  assigned_to       UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at       TIMESTAMPTZ,

  -- Tracking
  last_activity_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_followup_at  TIMESTAMPTZ,
  first_contacted_at TIMESTAMPTZ,           -- set when stage moves from New to Contacted
  sla_breach        BOOLEAN NOT NULL DEFAULT FALSE,

  -- Duplicate detection
  is_duplicate      BOOLEAN NOT NULL DEFAULT FALSE,
  duplicate_of      UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Notes (quick note, detailed notes in lead_activities)
  notes             TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_org_id ON leads(org_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_sla ON leads(sla_breach) WHERE sla_breach = TRUE;
CREATE INDEX IF NOT EXISTS idx_leads_search ON leads USING gin((name || ' ' || phone || ' ' || COALESCE(email,'')) gin_trgm_ops);

-- =============================================================================
-- LEAD ACTIVITIES (Activity Timeline)
-- =============================================================================
CREATE TABLE IF NOT EXISTS lead_activities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN (
                'note','call','email','whatsapp','sms',
                'stage_change','assignment','task_created',
                'site_visit_scheduled','site_visit_done',
                'document_uploaded','score_changed','csv_import'
              )),
  content     TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}',  -- e.g., {from_stage, to_stage, call_duration, etc.}
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities(created_at DESC);

-- =============================================================================
-- TASKS
-- =============================================================================
CREATE TABLE IF NOT EXISTS tasks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id     UUID REFERENCES leads(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('call','follow_up','site_visit','document','email','whatsapp','other')),
  title       TEXT NOT NULL,
  description TEXT,
  due_date    TIMESTAMPTZ NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled','overdue')),
  priority    TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_org_id ON tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- =============================================================================
-- DOCUMENTS (metadata — actual files in Supabase Storage)
-- =============================================================================
CREATE TABLE IF NOT EXISTS documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type   TEXT NOT NULL CHECK (entity_type IN ('lead','project','unit','client','channel_partner')),
  entity_id     UUID NOT NULL,
  file_name     TEXT NOT NULL,
  file_url      TEXT NOT NULL,
  file_size     INT,
  mime_type     TEXT,
  category      TEXT,   -- e.g., 'brochure', 'floor_plan', 'kyc_pan', 'agreement'
  uploaded_by   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN (
                'lead_assigned','sla_breach','task_due','task_overdue',
                'lead_stage_changed','site_visit_reminder','new_lead_captured',
                'csv_import_complete','system'
              )),
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  lead_id     UUID REFERENCES leads(id) ON DELETE CASCADE,
  task_id     UUID REFERENCES tasks(id) ON DELETE CASCADE,
  read_status BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE read_status = FALSE;

-- =============================================================================
-- AUDIT LOGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,           -- e.g., 'lead.created', 'lead.stage_changed', 'user.assigned'
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  INET,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- =============================================================================
-- PHASE 2 SCAFFOLDING — Tables present, UI deferred
-- =============================================================================

-- Channel Partners (Brokers/DSA)
CREATE TABLE IF NOT EXISTS channel_partners (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id               UUID REFERENCES users(id) ON DELETE SET NULL,  -- if they have a login
  name                  TEXT NOT NULL,
  phone                 TEXT NOT NULL,
  email                 TEXT,
  company_name          TEXT,
  rera_number           TEXT,
  kyc_status            TEXT NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending','submitted','approved','rejected')),
  commission_type       TEXT DEFAULT 'percentage' CHECK (commission_type IN ('percentage','flat')),
  commission_value      DECIMAL(10,2) DEFAULT 0,
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Commission Ledger
CREATE TABLE IF NOT EXISTS commission_ledger (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel_partner_id  UUID NOT NULL REFERENCES channel_partners(id) ON DELETE CASCADE,
  lead_id             UUID REFERENCES leads(id) ON DELETE SET NULL,
  amount              BIGINT NOT NULL,   -- INR
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid')),
  paid_at             TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clients (post-conversion)
CREATE TABLE IF NOT EXISTS clients (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id_origin        UUID REFERENCES leads(id) ON DELETE SET NULL,
  unit_id               UUID REFERENCES units(id) ON DELETE SET NULL,
  name                  TEXT NOT NULL,
  phone                 TEXT NOT NULL,
  email                 TEXT,
  kyc_status            TEXT DEFAULT 'pending',
  co_applicant_name     TEXT,
  co_applicant_phone    TEXT,
  booking_date          DATE,
  booking_amount        BIGINT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payment Schedules
CREATE TABLE IF NOT EXISTS payment_schedules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  milestone   TEXT NOT NULL,
  due_date    DATE NOT NULL,
  amount      BIGINT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue','waived')),
  paid_at     DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- UPDATED_AT TRIGGER (keeps updated_at fresh automatically)
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_channel_partners_updated_at BEFORE UPDATE ON channel_partners FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
