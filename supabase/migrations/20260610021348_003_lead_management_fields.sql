-- Add new lead-specific fields to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS lead_status TEXT DEFAULT 'New' CHECK (lead_status IN ('New', 'Converted', 'Rejected')),
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS assigned_to TEXT;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);