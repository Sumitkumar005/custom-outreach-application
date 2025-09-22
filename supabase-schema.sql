-- Supabase Database Schema for Email Outreach Tool
-- Run this in your Supabase SQL Editor

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Create batches table
CREATE TABLE IF NOT EXISTS batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  upload_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  csv_name TEXT NOT NULL,
  total_emails INTEGER NOT NULL DEFAULT 0,
  delivered INTEGER NOT NULL DEFAULT 0,
  opened INTEGER NOT NULL DEFAULT 0,
  clicked INTEGER NOT NULL DEFAULT 0,
  open_rate DECIMAL(5,2) DEFAULT 0.00,
  click_rate DECIMAL(5,2) DEFAULT 0.00,
  contacts JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(batch_id, email)
);

-- Create tracking_events table for detailed analytics
CREATE TABLE IF NOT EXISTS tracking_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  tracking_id TEXT NOT NULL,
  event_type TEXT CHECK (event_type IN ('open', 'click', 'bounce', 'bot_open')),
  ip_address INET,
  user_agent TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  device_type TEXT,
  browser TEXT,
  platform TEXT,
  url TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_genuine BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create settings table (per-user settings)
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  openai_api_key TEXT,
  email TEXT,
  app_password TEXT,
  cc_recipients TEXT,
  sender_name TEXT,
  sender_designation TEXT,
  sender_phone TEXT,
  sender_company TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the singleton row with a fixed UUID
INSERT INTO settings (id, openai_api_key, email, app_password, cc_recipients)
VALUES ('550e8400-e29b-41d4-a716-446655440000', '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- Drop existing indexes if they exist and recreate them
DROP INDEX IF EXISTS idx_contacts_batch_id;
DROP INDEX IF EXISTS idx_contacts_email;
DROP INDEX IF EXISTS idx_tracking_events_tracking_id;
DROP INDEX IF EXISTS idx_tracking_events_timestamp;
DROP INDEX IF EXISTS idx_tracking_events_event_type;
DROP INDEX IF EXISTS idx_batches_upload_time;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_batch_id ON contacts(batch_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_tracking_events_tracking_id ON tracking_events(tracking_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_timestamp ON tracking_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_tracking_events_event_type ON tracking_events(event_type);
CREATE INDEX IF NOT EXISTS idx_batches_upload_time ON batches(upload_time DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist and recreate them
DROP TRIGGER IF EXISTS update_batches_updated_at ON batches;
DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;

-- Create triggers for updated_at
CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations on batches" ON batches;
DROP POLICY IF EXISTS "Allow all operations on contacts" ON contacts;
DROP POLICY IF EXISTS "Allow all operations on tracking_events" ON tracking_events;
DROP POLICY IF EXISTS "Allow all operations on settings" ON settings;

-- Create policies (adjust based on your authentication needs)
-- For now, allow all operations (you can restrict this later)
CREATE POLICY "Allow all operations on batches" ON batches FOR ALL USING (true);
CREATE POLICY "Allow all operations on contacts" ON contacts FOR ALL USING (true);
CREATE POLICY "Allow all operations on tracking_events" ON tracking_events FOR ALL USING (true);
CREATE POLICY "Allow all operations on settings" ON settings FOR ALL USING (true);

-- Insert default settings row
INSERT INTO settings (openai_api_key, email, app_password, cc_recipients)
VALUES ('', '', '', '')
ON CONFLICT DO NOTHING;
