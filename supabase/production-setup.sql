-- ===================================================================
-- XFunnel Production Database Setup
-- ===================================================================
-- This file consolidates all migrations (000-006) into a single 
-- production-ready SQL file with proper ordering to avoid foreign 
-- key constraint issues.
--
-- Order of creation:
-- 1. Users table (base table, no dependencies)
-- 2. Articles table (depends on users)
-- 3. Workers table (depends on users and articles)
-- 4. Indexes
-- 5. Functions
-- 6. Triggers
-- 7. Views
-- 8. Policies
-- ===================================================================

-- ===================================================================
-- SECTION 1: USERS TABLE
-- ===================================================================
-- Base authentication table for all users in the system

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);

-- ===================================================================
-- SECTION 2: ARTICLES TABLE
-- ===================================================================
-- Main content table for articles created and edited by users

-- Create articles table with all columns
CREATE TABLE IF NOT EXISTS articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'draft',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  last_edited_by UUID REFERENCES users(id),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'published', 'archived', 'final'))
);

-- Update existing articles to set last_edited_by to created_by (if needed)
UPDATE articles 
SET last_edited_by = created_by 
WHERE last_edited_by IS NULL;

-- Create indexes for articles
CREATE INDEX IF NOT EXISTS idx_articles_created_by ON articles(created_by);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_last_edited_by ON articles(last_edited_by);

-- Add comments for clarity
COMMENT ON COLUMN articles.created_by IS 'User who originally created the article';
COMMENT ON COLUMN articles.last_edited_by IS 'User who last edited the article';

-- ===================================================================
-- SECTION 3: WORKERS TABLE
-- ===================================================================
-- Activity tracking table for user sessions on articles

-- Create workers table with all columns
CREATE TABLE IF NOT EXISTS workers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  session_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  session_end TIMESTAMP WITH TIME ZONE,
  time_spent_seconds INTEGER DEFAULT 0,
  ai_requests_count INTEGER DEFAULT 0,
  manual_edits_count INTEGER DEFAULT 0,
  words_added INTEGER DEFAULT 0,
  words_deleted INTEGER DEFAULT 0,
  initial_word_count INTEGER DEFAULT 0,
  final_word_count INTEGER DEFAULT 0,
  focus_count INTEGER DEFAULT 0,
  blur_count INTEGER DEFAULT 0,
  read_percentage INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add comment to explain the session management strategy
COMMENT ON TABLE workers IS 'Tracks user activity sessions per article. Each user can have one active session per article at a time. Sessions are marked as ended when session_end is set.';

-- Create indexes for workers table
CREATE INDEX idx_workers_user_id ON workers(user_id);
CREATE INDEX idx_workers_article_id ON workers(article_id);
CREATE INDEX idx_workers_session_start ON workers(session_start);
CREATE INDEX idx_workers_user_article ON workers(user_id, article_id);
CREATE INDEX idx_workers_last_active ON workers(last_active DESC);
CREATE INDEX idx_workers_is_active ON workers(is_active) WHERE is_active = true;

-- Create composite index for user/article/active session lookups
CREATE INDEX idx_workers_user_article_active 
ON workers(user_id, article_id, session_end) 
WHERE session_end IS NULL;

-- ===================================================================
-- SECTION 4: ENABLE ROW LEVEL SECURITY
-- ===================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- SECTION 5: FUNCTIONS
-- ===================================================================

-- Function to automatically update last_edited_by and updated_at
CREATE OR REPLACE FUNCTION update_last_edited_by()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_edited_by = auth.uid();
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate session metrics
CREATE OR REPLACE FUNCTION calculate_session_metrics(p_user_id UUID, p_article_id UUID)
RETURNS TABLE (
  total_sessions BIGINT,
  total_time_spent_seconds BIGINT,
  avg_time_per_session NUMERIC,
  total_ai_requests BIGINT,
  avg_read_percentage NUMERIC,
  total_focus_events BIGINT,
  total_blur_events BIGINT,
  last_session_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_sessions,
    COALESCE(SUM(time_spent_seconds), 0)::BIGINT as total_time_spent_seconds,
    COALESCE(AVG(time_spent_seconds), 0)::NUMERIC as avg_time_per_session,
    COALESCE(SUM(ai_requests_count), 0)::BIGINT as total_ai_requests,
    COALESCE(AVG(read_percentage), 0)::NUMERIC as avg_read_percentage,
    COALESCE(SUM(focus_count), 0)::BIGINT as total_focus_events,
    COALESCE(SUM(blur_count), 0)::BIGINT as total_blur_events,
    MAX(session_start) as last_session_date
  FROM workers
  WHERE 
    (p_user_id IS NULL OR user_id = p_user_id) AND
    (p_article_id IS NULL OR article_id = p_article_id);
END;
$$ LANGUAGE plpgsql;

-- Function to get or create active session
CREATE OR REPLACE FUNCTION get_or_create_active_session(
  p_user_id UUID,
  p_article_id UUID
)
RETURNS TABLE (
  session_id UUID,
  is_new BOOLEAN
) AS $$
DECLARE
  v_session_id UUID;
  v_is_new BOOLEAN := FALSE;
BEGIN
  -- First try to find an existing active session
  SELECT id INTO v_session_id
  FROM workers
  WHERE user_id = p_user_id
    AND article_id = p_article_id
    AND session_end IS NULL
    AND is_active = true
  ORDER BY session_start DESC
  LIMIT 1;
  
  -- If no active session found, create a new one
  IF v_session_id IS NULL THEN
    INSERT INTO workers (
      user_id,
      article_id,
      session_start,
      time_spent_seconds,
      is_active,
      last_active,
      created_at
    ) VALUES (
      p_user_id,
      p_article_id,
      TIMEZONE('utc', NOW()),
      0,
      true,
      TIMEZONE('utc', NOW()),
      TIMEZONE('utc', NOW())
    )
    RETURNING id INTO v_session_id;
    
    v_is_new := TRUE;
  END IF;
  
  RETURN QUERY SELECT v_session_id, v_is_new;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- SECTION 6: TRIGGERS
-- ===================================================================

-- Create trigger to automatically update last_edited_by on articles
DROP TRIGGER IF EXISTS update_articles_last_edited_by ON articles;
CREATE TRIGGER update_articles_last_edited_by
    BEFORE UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION update_last_edited_by();

-- ===================================================================
-- SECTION 7: VIEWS
-- ===================================================================

-- View for worker analytics
CREATE OR REPLACE VIEW worker_analytics AS
SELECT 
  w.user_id,
  u.email as user_email,
  w.article_id,
  a.title as article_title,
  w.session_start,
  w.session_end,
  w.time_spent_seconds,
  w.ai_requests_count,
  w.manual_edits_count,
  w.words_added,
  w.words_deleted,
  w.final_word_count - w.initial_word_count as net_words_change,
  w.final_word_count
FROM workers w
JOIN users u ON w.user_id = u.id
JOIN articles a ON w.article_id = a.id;

-- View for activity logs (backwards compatibility)
CREATE OR REPLACE VIEW activity_logs AS
SELECT 
  id,
  user_id,
  article_id,
  session_start,
  session_end,
  time_spent_seconds,
  focus_count,
  blur_count,
  read_percentage,
  is_active,
  last_active,
  ai_requests_count,
  manual_edits_count,
  words_added,
  words_deleted,
  initial_word_count,
  final_word_count,
  created_at
FROM workers;

-- View for active sessions with aggregated stats
CREATE OR REPLACE VIEW active_sessions_stats AS
SELECT 
  w.user_id,
  w.article_id,
  w.id as session_id,
  w.session_start,
  w.last_active,
  w.time_spent_seconds,
  w.ai_requests_count,
  w.manual_edits_count,
  w.focus_count,
  w.blur_count,
  w.read_percentage,
  a.title as article_title,
  u.email as user_email,
  -- Calculate session duration in a human-readable format
  CASE 
    WHEN w.time_spent_seconds < 60 THEN w.time_spent_seconds || ' seconds'
    WHEN w.time_spent_seconds < 3600 THEN (w.time_spent_seconds / 60)::INTEGER || ' minutes'
    ELSE (w.time_spent_seconds / 3600)::NUMERIC(10,1) || ' hours'
  END as duration_readable
FROM workers w
JOIN articles a ON w.article_id = a.id
JOIN users u ON w.user_id = u.id
WHERE w.session_end IS NULL
  AND w.is_active = true
ORDER BY w.last_active DESC;

-- ===================================================================
-- SECTION 8: ROW LEVEL SECURITY POLICIES
-- ===================================================================

-- Users table policies
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Anyone can register" ON users
  FOR INSERT WITH CHECK (true);

-- Articles table policies (shared access model)
CREATE POLICY "All authenticated users can view all articles" ON articles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can create articles" ON articles
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can update all articles" ON articles
  FOR UPDATE USING (auth.uid() IS NOT NULL)
  WITH CHECK (last_edited_by = auth.uid());

CREATE POLICY "All authenticated users can delete all articles" ON articles
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Workers table policies
CREATE POLICY "Users can view own worker sessions" ON workers
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own worker sessions" ON workers
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own worker sessions" ON workers
  FOR UPDATE USING (user_id = auth.uid());

-- ===================================================================
-- SECTION 9: GRANT PERMISSIONS
-- ===================================================================

-- Grant access to views
GRANT SELECT ON worker_analytics TO authenticated;
GRANT SELECT ON activity_logs TO authenticated;
GRANT SELECT ON active_sessions_stats TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION calculate_session_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_active_session TO authenticated;

-- ===================================================================
-- SECTION 10: VERIFICATION QUERIES
-- ===================================================================
-- Uncomment these queries to verify the database structure after setup

-- -- Check users table structure
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'users'
-- ORDER BY ordinal_position;

-- -- Check articles table structure
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'articles'
-- ORDER BY ordinal_position;

-- -- Check workers table structure
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'workers'
-- ORDER BY ordinal_position;

-- -- List all indexes
-- SELECT schemaname, tablename, indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;

-- -- List all policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- ===================================================================
-- END OF PRODUCTION SETUP
-- ===================================================================