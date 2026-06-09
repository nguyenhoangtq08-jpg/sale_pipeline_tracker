-- Create leads table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  deal_size DECIMAL(12,2) DEFAULT 0,
  source TEXT DEFAULT 'Other',
  stage TEXT DEFAULT 'Prospecting',
  probability INTEGER DEFAULT 20,
  notes TEXT,
  user_id TEXT DEFAULT '0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activities table
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  lead_name TEXT NOT NULL,
  company TEXT,
  stage TEXT,
  date DATE DEFAULT CURRENT_DATE,
  duration INTEGER DEFAULT 0,
  notes TEXT,
  next_action TEXT,
  user_id TEXT DEFAULT '0',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Create policies for leads
CREATE POLICY "select_leads" ON leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_leads" ON leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_leads" ON leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_leads" ON leads FOR DELETE TO authenticated USING (true);

-- Create policies for activities
CREATE POLICY "select_activities" ON activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_activities" ON activities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_activities" ON activities FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_activities" ON activities FOR DELETE TO authenticated USING (true);

-- Create indexes
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_leads_user ON leads(user_id);
CREATE INDEX idx_activities_lead ON activities(lead_id);
CREATE INDEX idx_activities_date ON activities(date);
CREATE INDEX idx_activities_user ON activities(user_id);