-- ============================================================
-- Migration 006: Follow-up Notification Support
-- Adds notified_at column to tasks and performance indexes
-- for the follow-up reminder cron service.
-- ============================================================

-- 1. Add notified_at column to tasks (tracks last reminder sent time)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;

-- 2. Performance index for the cron query: tasks due soon (pending/in_progress)
CREATE INDEX IF NOT EXISTS idx_tasks_due_date_status
  ON tasks (due_date, status);

-- 3. Performance index for overdue task detection
CREATE INDEX IF NOT EXISTS idx_tasks_status_due_date
  ON tasks (status, due_date)
  WHERE status IN ('pending', 'in_progress');

-- 4. Performance index for lead follow-up reminder query
CREATE INDEX IF NOT EXISTS idx_leads_next_followup_assigned
  ON leads (next_followup_at, assigned_to)
  WHERE next_followup_at IS NOT NULL AND assigned_to IS NOT NULL;

-- 5. Ensure notifications type constraint includes all required types.
--    We safely drop and recreate the check constraint to include every
--    type value used by the system (no-op if already complete).
DO $$
BEGIN
  -- Drop existing check constraint on notifications.type if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'notifications'
      AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%type%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE notifications DROP CONSTRAINT ' || quote_ident(constraint_name)
      FROM information_schema.table_constraints
      WHERE table_name = 'notifications'
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%type%'
      LIMIT 1
    );
  END IF;

  -- Recreate constraint with the full set of valid types
  ALTER TABLE notifications
    ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
      'lead_assigned',
      'sla_breach',
      'task_due',
      'task_overdue',
      'lead_stage_changed',
      'site_visit_reminder',
      'new_lead_captured',
      'csv_import_complete',
      'system'
    ));
EXCEPTION
  WHEN duplicate_object THEN
    -- Constraint already exists with this name — nothing to do
    NULL;
END;
$$;
