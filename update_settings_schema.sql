-- Create a settings table for dynamic configuration
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT
);

-- Insert the default WhatsApp Link
INSERT INTO settings (key, value, description)
VALUES ('wa_link', 'https://chat.whatsapp.com/your-default-link', 'Link Join Grup WhatsApp');

-- Enable Row Level Security (RLS)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to settings
CREATE POLICY "Public settings are viewable by everyone" 
ON settings FOR SELECT 
USING (true);
