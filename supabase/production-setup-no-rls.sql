-- ===================================================================
-- XFunnel Production Database Setup (Without RLS)
-- ===================================================================
-- This file consolidates all migrations (000-006) into a single 
-- production-ready SQL file for applications using custom authentication
-- instead of Supabase Auth.
--
-- Order of creation:
-- 1. Users table (base table, no dependencies)
-- 2. Articles table (depends on users)
-- 3. Workers table (depends on users and articles)
-- 4. Indexes
-- 5. Functions
-- 6. Triggers
-- 7. Views
--
-- RLS (Row Level Security) is NOT enabled in this version since
-- the application uses custom JWT authentication.
-- ===================================================================

-- ===================================================================
-- SECTION 1: USERS TABLE
-- ===================================================================
-- Base authentication table for all users in the system

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

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
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_updated_at ON articles(updated_at DESC);

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
CREATE INDEX IF NOT EXISTS idx_workers_user_id ON workers(user_id);
CREATE INDEX IF NOT EXISTS idx_workers_article_id ON workers(article_id);
CREATE INDEX IF NOT EXISTS idx_workers_is_active ON workers(is_active);
CREATE INDEX IF NOT EXISTS idx_workers_user_article_active ON workers(user_id, article_id, is_active);
CREATE INDEX IF NOT EXISTS idx_workers_session_start ON workers(session_start DESC);

-- ===================================================================
-- SECTION 4: FUNCTIONS
-- ===================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get or create an active worker session
CREATE OR REPLACE FUNCTION get_or_create_worker_session(
  p_user_id UUID,
  p_article_id UUID
)
RETURNS TABLE (
  session_id UUID,
  is_new BOOLEAN
) AS $$
DECLARE
  v_session_id UUID;
  v_is_new BOOLEAN := false;
BEGIN
  -- First try to find an existing active session
  SELECT id INTO v_session_id
  FROM workers
  WHERE user_id = p_user_id 
    AND article_id = p_article_id 
    AND is_active = true
  LIMIT 1;
  
  -- If no active session found, create a new one
  IF v_session_id IS NULL THEN
    INSERT INTO workers (user_id, article_id, is_active, session_start)
    VALUES (p_user_id, p_article_id, true, TIMEZONE('utc', NOW()))
    RETURNING id INTO v_session_id;
    
    v_is_new := true;
  END IF;
  
  RETURN QUERY SELECT v_session_id, v_is_new;
END;
$$ LANGUAGE plpgsql;

-- Function to end a worker session
CREATE OR REPLACE FUNCTION end_worker_session(
  p_session_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE workers
  SET 
    is_active = false,
    session_end = TIMEZONE('utc', NOW())
  WHERE id = p_session_id AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- SECTION 5: TRIGGERS
-- ===================================================================

-- Add triggers to update the updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- SECTION 6: VIEWS
-- ===================================================================

-- View for active worker sessions with user and article information
CREATE OR REPLACE VIEW active_worker_sessions AS
SELECT 
  w.id AS session_id,
  w.user_id,
  u.email AS user_email,
  w.article_id,
  a.title AS article_title,
  w.session_start,
  w.time_spent_seconds,
  w.ai_requests_count,
  w.manual_edits_count,
  w.last_active
FROM workers w
JOIN users u ON w.user_id = u.id
JOIN articles a ON w.article_id = a.id
WHERE w.is_active = true;

-- View for article statistics
CREATE OR REPLACE VIEW article_statistics AS
SELECT 
  a.id AS article_id,
  a.title,
  a.created_by,
  a.last_edited_by,
  COUNT(DISTINCT w.user_id) AS unique_editors,
  SUM(w.time_spent_seconds) AS total_time_spent,
  SUM(w.ai_requests_count) AS total_ai_requests,
  SUM(w.manual_edits_count) AS total_manual_edits,
  MAX(w.last_active) AS last_activity
FROM articles a
LEFT JOIN workers w ON a.id = w.article_id
GROUP BY a.id, a.title, a.created_by, a.last_edited_by;

-- ===================================================================
-- SECTION 7: SAMPLE DATA (Optional - Remove for production)
-- ===================================================================
-- Uncomment below to add a test user and article

-- INSERT INTO users (email, password, name)
-- VALUES ('test@example.com', '$2a$10$PJvD3LO1Y1JlMkG5R5wgOu8VqKr9kZJx4x3U7EBbqGkFkwDmqnB7.', 'Test User')
-- ON CONFLICT (email) DO NOTHING;

-- ===================================================================
-- VERIFICATION QUERIES
-- ===================================================================
-- Run these queries to verify the database setup:

-- Check tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('users', 'articles', 'workers');

-- Check indexes
-- SELECT indexname FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('users', 'articles', 'workers');

-- Check functions
-- SELECT routine_name FROM information_schema.routines 
-- WHERE routine_schema = 'public' 
-- AND routine_type = 'FUNCTION';