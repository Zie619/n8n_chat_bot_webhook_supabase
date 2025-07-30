-- Combined Supabase Migrations
-- Generated for manual setup
-- Run this in your Supabase SQL Editor

-- ========================================
-- Migration: 000-create-articles-table.sql
-- ========================================
-- Create articles table
CREATE TABLE IF NOT EXISTS articles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    -- Activity tracking columns
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    total_time_spent INTEGER DEFAULT 0, -- in seconds
    active_time_spent INTEGER DEFAULT 0, -- in seconds
    edit_count INTEGER DEFAULT 0,
    ai_request_count INTEGER DEFAULT 0,
    word_count INTEGER DEFAULT 0,
    -- Session tracking
    session_id TEXT,
    session_started_at TIMESTAMP WITH TIME ZONE,
    session_data JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX idx_articles_user_id ON articles(user_id);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX idx_articles_session_id ON articles(session_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own articles" ON articles
    FOR SELECT USING (auth.uid()::text = user_id OR user_id = 'anonymous');

CREATE POLICY "Users can create their own articles" ON articles
    FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id = 'anonymous');

CREATE POLICY "Users can update their own articles" ON articles
    FOR UPDATE USING (auth.uid()::text = user_id OR user_id = 'anonymous');

CREATE POLICY "Users can delete their own articles" ON articles
    FOR DELETE USING (auth.uid()::text = user_id OR user_id = 'anonymous');

-- ========================================
-- Migration: 001-create-users-table.sql
-- ========================================
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    -- Activity tracking
    last_login TIMESTAMP WITH TIME ZONE,
    total_articles INTEGER DEFAULT 0,
    total_time_spent INTEGER DEFAULT 0, -- in seconds
    total_ai_requests INTEGER DEFAULT 0
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Create updated_at trigger (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Public policy for user creation (registration)
CREATE POLICY "Enable insert for registration" ON users
    FOR INSERT WITH CHECK (true);

-- ========================================
-- Migration: 002-create-workers-table.sql
-- ========================================
-- Create workers table for tracking AI worker sessions
CREATE TABLE IF NOT EXISTS workers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    worker_type TEXT NOT NULL, -- 'article_generator', 'content_enhancer', etc.
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    completed_at TIMESTAMP WITH TIME ZONE,
    -- Metrics
    request_count INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    processing_time INTEGER DEFAULT 0, -- in seconds
    -- Session data
    session_data JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes
CREATE INDEX idx_workers_article_id ON workers(article_id);
CREATE INDEX idx_workers_user_id ON workers(user_id);
CREATE INDEX idx_workers_status ON workers(status);
CREATE INDEX idx_workers_worker_type ON workers(worker_type);
CREATE INDEX idx_workers_started_at ON workers(started_at DESC);

-- Create updated_at trigger
CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON workers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own worker sessions" ON workers
    FOR SELECT USING (auth.uid()::text = user_id OR user_id = 'anonymous');

CREATE POLICY "Users can create their own worker sessions" ON workers
    FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id = 'anonymous');

CREATE POLICY "Users can update their own worker sessions" ON workers
    FOR UPDATE USING (auth.uid()::text = user_id OR user_id = 'anonymous');

-- ========================================
-- Migration: 003-add-activity-tracking-functions.sql
-- ========================================
-- Function to update article activity metrics
CREATE OR REPLACE FUNCTION update_article_activity(
    p_article_id UUID,
    p_time_spent INTEGER DEFAULT 0,
    p_active_time INTEGER DEFAULT 0,
    p_edits INTEGER DEFAULT 0,
    p_ai_requests INTEGER DEFAULT 0,
    p_words INTEGER DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    UPDATE articles
    SET 
        last_activity = TIMEZONE('utc', NOW()),
        total_time_spent = total_time_spent + p_time_spent,
        active_time_spent = active_time_spent + p_active_time,
        edit_count = edit_count + p_edits,
        ai_request_count = ai_request_count + p_ai_requests,
        word_count = COALESCE(p_words, word_count)
    WHERE id = p_article_id;
END;
$$ LANGUAGE plpgsql;

-- Function to end article session
CREATE OR REPLACE FUNCTION end_article_session(
    p_article_id UUID,
    p_session_data JSONB DEFAULT '{}'::jsonb
)
RETURNS void AS $$
BEGIN
    UPDATE articles
    SET 
        session_data = p_session_data,
        session_id = NULL,
        session_started_at = NULL
    WHERE id = p_article_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update user statistics
CREATE OR REPLACE FUNCTION update_user_stats(
    p_user_id TEXT
)
RETURNS void AS $$
BEGIN
    UPDATE users
    SET 
        total_articles = (SELECT COUNT(*) FROM articles WHERE user_id = p_user_id),
        total_time_spent = (SELECT COALESCE(SUM(total_time_spent), 0) FROM articles WHERE user_id = p_user_id),
        total_ai_requests = (SELECT COALESCE(SUM(ai_request_count), 0) FROM articles WHERE user_id = p_user_id)
    WHERE id::text = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Migration: 004-add-session-tracking.sql
-- ========================================
-- Add session tracking table for detailed analytics
CREATE TABLE IF NOT EXISTS activity_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    ended_at TIMESTAMP WITH TIME ZONE,
    -- Metrics
    total_time INTEGER DEFAULT 0, -- in seconds
    active_time INTEGER DEFAULT 0, -- in seconds
    idle_time INTEGER DEFAULT 0, -- in seconds
    focus_time INTEGER DEFAULT 0, -- in seconds (when tab is visible)
    blur_time INTEGER DEFAULT 0, -- in seconds (when tab is not visible)
    -- Activity counts
    edit_count INTEGER DEFAULT 0,
    ai_request_count INTEGER DEFAULT 0,
    save_count INTEGER DEFAULT 0,
    -- Session data
    events JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes
CREATE INDEX idx_activity_sessions_article_id ON activity_sessions(article_id);
CREATE INDEX idx_activity_sessions_user_id ON activity_sessions(user_id);
CREATE INDEX idx_activity_sessions_session_id ON activity_sessions(session_id);
CREATE INDEX idx_activity_sessions_started_at ON activity_sessions(started_at DESC);

-- Enable Row Level Security
ALTER TABLE activity_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own activity sessions" ON activity_sessions
    FOR SELECT USING (auth.uid()::text = user_id OR user_id = 'anonymous');

CREATE POLICY "Users can create their own activity sessions" ON activity_sessions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id = 'anonymous');

CREATE POLICY "Users can update their own activity sessions" ON activity_sessions
    FOR UPDATE USING (auth.uid()::text = user_id OR user_id = 'anonymous');

-- Add function to record session events
CREATE OR REPLACE FUNCTION record_session_event(
    p_session_id TEXT,
    p_event_type TEXT,
    p_event_data JSONB DEFAULT '{}'::jsonb
)
RETURNS void AS $$
BEGIN
    UPDATE activity_sessions
    SET events = events || jsonb_build_object(
        'type', p_event_type,
        'data', p_event_data,
        'timestamp', EXTRACT(EPOCH FROM NOW())
    )
    WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql;