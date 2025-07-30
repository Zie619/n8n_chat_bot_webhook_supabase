-- Create workers table for activity tracking
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add RLS
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own worker sessions" ON workers
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own worker sessions" ON workers
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own worker sessions" ON workers
  FOR UPDATE USING (user_id = auth.uid());

-- Create indexes for better query performance
CREATE INDEX idx_workers_user_id ON workers(user_id);
CREATE INDEX idx_workers_article_id ON workers(article_id);
CREATE INDEX idx_workers_session_start ON workers(session_start);
CREATE INDEX idx_workers_user_article ON workers(user_id, article_id);

-- Create a view for session analytics
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

-- Grant access to the view
GRANT SELECT ON worker_analytics TO authenticated;