import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/auth';

// Create Supabase client for server-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const authPayload = verifyToken(token);
    if (!authPayload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get article ID from query params (optional)
    const articleId = request.nextUrl.searchParams.get('articleId');

    // Build query for worker sessions
    let query = supabase
      .from('workers')
      .select('*')
      .eq('user_id', authPayload.userId);

    if (articleId) {
      query = query.eq('article_id', articleId);
    }

    // Fetch all sessions for accurate totals
    const { data: sessions, error } = await query.order('session_start', { ascending: false });

    if (error) {
      console.error('Error fetching worker sessions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch worker sessions', details: error.message },
        { status: 500 }
      );
    }

    // Calculate aggregated stats from ALL sessions
    const allSessions = sessions || [];
    const stats = {
      totalSessions: allSessions.length,
      totalTimeSpent: allSessions.reduce((sum, s) => sum + (s.time_spent_seconds || 0), 0),
      totalAiRequests: allSessions.reduce((sum, s) => sum + (s.ai_requests_count || 0), 0),
      totalManualEdits: allSessions.reduce((sum, s) => sum + (s.manual_edits_count || 0), 0),
      avgReadPercentage: allSessions.length > 0 
        ? Math.round(allSessions.reduce((sum, s) => sum + (s.read_percentage || 0), 0) / allSessions.length)
        : 0,
      totalFocusEvents: allSessions.reduce((sum, s) => sum + (s.focus_count || 0), 0),
      totalBlurEvents: allSessions.reduce((sum, s) => sum + (s.blur_count || 0), 0),
      // Only return the 10 most recent sessions for display
      recentSessions: allSessions.slice(0, 10),
      // Additional metadata
      firstSessionDate: allSessions.length > 0 ? allSessions[allSessions.length - 1].session_start : null,
      lastSessionDate: allSessions.length > 0 ? allSessions[0].session_start : null,
      activeSessions: allSessions.filter(s => s.is_active && !s.session_end).length,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in worker stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}