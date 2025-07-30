-- Improve workers table for better session tracking
-- Add composite index for finding active sessions efficiently

-- Create composite index for user/article/active session lookups
CREATE INDEX IF NOT EXISTS idx_workers_user_article_active 
ON workers(user_id, article_id, session_end) 
WHERE session_end IS NULL;

-- Create function to get or create active session
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

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_or_create_active_session TO authenticated;

-- Create view for active sessions with aggregated stats
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

-- Grant access to the view
GRANT SELECT ON active_sessions_stats TO authenticated;

-- Add comment to explain the session management strategy
COMMENT ON TABLE workers IS 'Tracks user activity sessions per article. Each user can have one active session per article at a time. Sessions are marked as ended when session_end is set.';