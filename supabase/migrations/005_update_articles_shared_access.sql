-- Migration to make articles visible to all users
-- Change from single-user ownership to shared access with last editor tracking

-- Add last_edited_by column
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES users(id);

-- Update existing articles to set last_edited_by to created_by
UPDATE articles 
SET last_edited_by = created_by 
WHERE last_edited_by IS NULL;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view own articles" ON articles;
DROP POLICY IF EXISTS "Users can create articles" ON articles;
DROP POLICY IF EXISTS "Users can update own articles" ON articles;
DROP POLICY IF EXISTS "Users can delete own articles" ON articles;

-- Create new policies for shared access
CREATE POLICY "All authenticated users can view all articles" ON articles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can create articles" ON articles
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can update all articles" ON articles
  FOR UPDATE USING (auth.uid() IS NOT NULL)
  WITH CHECK (last_edited_by = auth.uid());

CREATE POLICY "All authenticated users can delete all articles" ON articles
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create index for last_edited_by
CREATE INDEX IF NOT EXISTS idx_articles_last_edited_by ON articles(last_edited_by);

-- Add trigger to automatically update last_edited_by on UPDATE
CREATE OR REPLACE FUNCTION update_last_edited_by()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_edited_by = auth.uid();
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS update_articles_last_edited_by ON articles;
CREATE TRIGGER update_articles_last_edited_by
    BEFORE UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION update_last_edited_by();

-- Add comment for clarity
COMMENT ON COLUMN articles.created_by IS 'User who originally created the article';
COMMENT ON COLUMN articles.last_edited_by IS 'User who last edited the article';