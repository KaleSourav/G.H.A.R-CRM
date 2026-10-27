-- =============================================================================
-- G.H.A.R CRM — Migration 005: Add Lead Budget Column and Schema Safeguards
-- Run this in Supabase SQL Editor
-- =============================================================================

-- 1. Add 'budget' column to leads table so direct queries or inserts on 'budget' never fail
ALTER TABLE leads ADD COLUMN IF NOT EXISTS budget BIGINT;

-- 2. Backfill existing leads' budget column from budget_max or budget_min
UPDATE leads 
SET budget = COALESCE(budget_max, budget_min) 
WHERE budget IS NULL AND (budget_max IS NOT NULL OR budget_min IS NOT NULL);

-- 3. Add index on budget for filtering & sorting performance
CREATE INDEX IF NOT EXISTS idx_leads_budget ON leads(budget);
CREATE INDEX IF NOT EXISTS idx_leads_budget_max ON leads(budget_max);
CREATE INDEX IF NOT EXISTS idx_leads_budget_min ON leads(budget_min);
