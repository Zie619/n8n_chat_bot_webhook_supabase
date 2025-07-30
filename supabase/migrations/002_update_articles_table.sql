-- Update articles table to add user relationship
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW());

-- Update RLS policies for articles
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own articles" ON articles;
DROP POLICY IF EXISTS "Users can create articles" ON articles;
DROP POLICY IF EXISTS "Users can update own articles" ON articles;
DROP POLICY IF EXISTS "Users can delete own articles" ON articles;

-- Create new policies
CREATE POLICY "Users can view own articles" ON articles
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create articles" ON articles
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own articles" ON articles
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete own articles" ON articles
  FOR DELETE USING (created_by = auth.uid());

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_articles_created_by ON articles(created_by);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);