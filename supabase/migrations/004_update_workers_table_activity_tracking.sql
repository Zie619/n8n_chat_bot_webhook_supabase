-- Update workers table to better support activity tracking
-- Add columns for focus/blur tracking and read percentage

-- Add new columns for better activity tracking
ALTER TABLE workers 
ADD COLUMN IF NOT EXISTS focus_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS blur_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS read_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW());

-- Create activity_logs view for backwards compatibility and analytics
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

-- Grant access to the view
GRANT SELECT ON activity_logs TO authenticated;

-- Create function to calculate session metrics
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

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION calculate_session_metrics TO authenticated;

-- Create index for better performance on activity queries
CREATE INDEX IF NOT EXISTS idx_workers_last_active ON workers(last_active DESC);
CREATE INDEX IF NOT EXISTS idx_workers_is_active ON workers(is_active) WHERE is_active = true;