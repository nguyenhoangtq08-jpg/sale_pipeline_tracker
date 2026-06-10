-- Add assigned_to column to scheduled_todos for task assignment feature
ALTER TABLE scheduled_todos ADD COLUMN IF NOT EXISTS assigned_to TEXT;

-- Create index for assigned_to lookups
CREATE INDEX IF NOT EXISTS idx_scheduled_todos_assigned ON scheduled_todos(assigned_to);