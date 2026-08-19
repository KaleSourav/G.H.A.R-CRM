-- =============================================================================
-- G.H.A.R CRM — Seed Data
-- Migration: 003_seed_data.sql
-- Run AFTER 002_rls_policies.sql
-- Creates default org, sample data for development
-- =============================================================================

-- Default organization
INSERT INTO organizations (id, name, domain, slug, settings)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'G.H.A.R — Gem Homes Advisory & Realtors',
  'crm.ghar.in',
  'ghar',
  '{
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
    ],
    "configurations": ["1BHK", "2BHK", "3BHK", "4BHK", "5BHK", "Villa", "Plot", "Studio", "Commercial"]
  }'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- NOTE: User records must reference auth.users IDs.
-- Create auth users in Supabase Dashboard first, then insert here.
-- Below is a template — replace UUIDs with actual auth.users IDs.

/*
-- ── ADMIN USER ────────────────────────────────────────────────────────────────
INSERT INTO users (id, org_id, name, email, phone, role, status)
VALUES (
  'REPLACE_WITH_ACTUAL_AUTH_USER_ID',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Admin User',
  'admin@ghar.in',
  '+91 9000000001',
  'admin',
  'active'
);

-- ── MANAGER USER ───────────────────────────────────────────────────────────────
INSERT INTO users (id, org_id, name, email, phone, role, status)
VALUES (
  'REPLACE_WITH_ACTUAL_MANAGER_AUTH_ID',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Priya Sharma',
  'priya.sharma@ghar.in',
  '+91 9000000002',
  'manager',
  'active'
);

-- ── EXECUTIVE USER ────────────────────────────────────────────────────────────
INSERT INTO users (id, org_id, name, email, phone, role, manager_id, status)
VALUES (
  'REPLACE_WITH_ACTUAL_EXEC_AUTH_ID',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Rahul Verma',
  'rahul.verma@ghar.in',
  '+91 9000000003',
  'executive',
  'REPLACE_WITH_MANAGER_ID',
  'active'
);
*/

-- =============================================================================
-- SAMPLE PROJECTS (safe to insert — no auth dependency)
-- =============================================================================
INSERT INTO projects (id, org_id, name, developer_name, location, rera_number, launch_date, possession_date, status, amenities, price_min, price_max, total_units, available_units)
VALUES
(
  'b1b2c3d4-0000-0000-0000-000000000001',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Emerald Heights',
  'G.H.A.R Developers',
  'Baner, Pune',
  'P52100046839',
  '2024-01-01',
  '2026-12-31',
  'active',
  ARRAY['Swimming Pool', 'Gym', 'Clubhouse', 'Children Play Area', 'Security', 'Power Backup', 'Covered Parking'],
  5000000,
  15000000,
  120,
  78
),
(
  'b1b2c3d4-0000-0000-0000-000000000002',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Pearl Residency',
  'G.H.A.R Developers',
  'Wakad, Pune',
  'P52100052991',
  '2024-06-01',
  '2027-06-30',
  'active',
  ARRAY['Rooftop Garden', 'Gym', 'Community Hall', 'EV Charging', 'Security', 'Solar Power'],
  4500000,
  9000000,
  80,
  65
),
(
  'b1b2c3d4-0000-0000-0000-000000000003',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Sapphire Villas',
  'G.H.A.R Developers',
  'Hinjewadi, Pune',
  'P52100059231',
  '2025-03-01',
  '2028-03-31',
  'upcoming',
  ARRAY['Private Pool', 'Landscaped Garden', 'Club House', 'Sports Court', 'Smart Home'],
  12000000,
  25000000,
  24,
  24
)
ON CONFLICT (id) DO NOTHING;

-- Sample units for Emerald Heights
INSERT INTO units (project_id, tower, floor, unit_number, configuration, area_sqft, facing, price, status)
VALUES
('b1b2c3d4-0000-0000-0000-000000000001', 'A', 3, 'A-301', '2BHK', 985.00, 'East', 6500000, 'available'),
('b1b2c3d4-0000-0000-0000-000000000001', 'A', 3, 'A-302', '3BHK', 1350.00, 'West', 8900000, 'available'),
('b1b2c3d4-0000-0000-0000-000000000001', 'A', 4, 'A-401', '2BHK', 985.00, 'East', 6700000, 'booked'),
('b1b2c3d4-0000-0000-0000-000000000001', 'A', 4, 'A-402', '3BHK', 1350.00, 'North', 9100000, 'sold'),
('b1b2c3d4-0000-0000-0000-000000000001', 'B', 2, 'B-201', '1BHK', 650.00, 'South', 4200000, 'available'),
('b1b2c3d4-0000-0000-0000-000000000001', 'B', 2, 'B-202', '2BHK', 985.00, 'West', 6500000, 'held'),
('b1b2c3d4-0000-0000-0000-000000000001', 'B', 5, 'B-501', '3BHK', 1400.00, 'East', 9500000, 'available'),
('b1b2c3d4-0000-0000-0000-000000000001', 'B', 6, 'B-601', '3BHK', 1400.00, 'North', 9800000, 'available')
ON CONFLICT DO NOTHING;

-- Sample units for Pearl Residency
INSERT INTO units (project_id, tower, floor, unit_number, configuration, area_sqft, facing, price, status)
VALUES
('b1b2c3d4-0000-0000-0000-000000000002', NULL, 1, '101', '1BHK', 580.00, 'East', 4600000, 'available'),
('b1b2c3d4-0000-0000-0000-000000000002', NULL, 2, '201', '2BHK', 920.00, 'West', 7200000, 'available'),
('b1b2c3d4-0000-0000-0000-000000000002', NULL, 3, '301', '2BHK', 920.00, 'North', 7400000, 'booked'),
('b1b2c3d4-0000-0000-0000-000000000002', NULL, 4, '401', '3BHK', 1280.00, 'East', 9800000, 'available')
ON CONFLICT DO NOTHING;
