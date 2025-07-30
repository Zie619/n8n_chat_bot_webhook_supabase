-- Fix missing columns in workers table
-- Run this if you're getting errors about missing columns like 'ai_requests_count'

-- Add missing columns that might not exist
ALTER TABLE workers ADD COLUMN IF NOT EXISTS ai_requests_count INTEGER DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS manual_edits_count INTEGER DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS focus_count INTEGER DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS blur_count INTEGER DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS read_percentage INTEGER DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW());

-- Ensure all columns from migration 003 exist
ALTER TABLE workers ADD COLUMN IF NOT EXISTS words_added INTEGER DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS words_deleted INTEGER DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS initial_word_count INTEGER DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS final_word_count INTEGER DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS session_end TIMESTAMP WITH TIME ZONE;

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_workers_last_active ON workers(last_active DESC);
CREATE INDEX IF NOT EXISTS idx_workers_is_active ON workers(is_active) WHERE is_active = true;

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'workers'
ORDER BY ordinal_position;