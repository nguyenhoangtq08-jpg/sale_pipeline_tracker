-- Add owner_id to leads if not exists, update existing
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'owner_id') THEN
    ALTER TABLE leads ADD COLUMN owner_id TEXT DEFAULT '0';
  END IF;
END $$;

-- Add owner_id to activities if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'owner_id') THEN
    ALTER TABLE activities ADD COLUMN owner_id TEXT DEFAULT '0';
  END IF;
END $$;

-- Create scheduled_todos table
CREATE TABLE IF NOT EXISTS scheduled_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  lead_name TEXT NOT NULL,
  company TEXT,
  stage TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TEXT,
  agenda TEXT NOT NULL,
  done BOOLEAN DEFAULT FALSE,
  owner_id TEXT DEFAULT '0',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create lead_rules table for manager threshold settings
CREATE TABLE IF NOT EXISTS lead_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warm_days INTEGER DEFAULT 7,
  cold_days INTEGER DEFAULT 14,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

-- Insert default lead rules if not exists
INSERT INTO lead_rules (warm_days, cold_days)
SELECT 7, 14
WHERE NOT EXISTS (SELECT 1 FROM lead_rules);

-- Enable RLS on new tables
ALTER TABLE scheduled_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_rules ENABLE ROW LEVEL SECURITY;

-- Create policies for scheduled_todos
CREATE POLICY "select_scheduled_todos" ON scheduled_todos FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_scheduled_todos" ON scheduled_todos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_scheduled_todos" ON scheduled_todos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_scheduled_todos" ON scheduled_todos FOR DELETE TO authenticated USING (true);

-- Create policies for lead_rules
CREATE POLICY "select_lead_rules" ON lead_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "update_lead_rules" ON lead_rules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leads_owner ON leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_activities_owner ON activities(owner_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_todos_owner ON scheduled_todos(owner_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_todos_date ON scheduled_todos(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_todos_done ON scheduled_todos(done);