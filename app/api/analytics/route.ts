import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client for server-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '100');
    
    // Build query
    let query = supabase
      .from('workers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    // Apply filters
    if (articleId) {
      query = query.eq('article_id', articleId);
    }
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching analytics data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch analytics data' },
        { status: 500 }
      );
    }
    
    // Calculate aggregate metrics
    const aggregateData = data?.reduce((acc, session) => {
      return {
        totalSessions: acc.totalSessions + 1,
        totalTimeSpent: acc.totalTimeSpent + (session.time_spent_seconds || 0),
        totalAiRequests: acc.totalAiRequests + (session.ai_requests_count || 0),
        totalManualEdits: acc.totalManualEdits + (session.manual_edits_count || 0),
        totalFocusEvents: acc.totalFocusEvents + (session.focus_count || 0),
        totalBlurEvents: acc.totalBlurEvents + (session.blur_count || 0),
        avgReadPercentage: acc.avgReadPercentage + (session.read_percentage || 0),
      };
    }, {
      totalSessions: 0,
      totalTimeSpent: 0,
      totalAiRequests: 0,
      totalManualEdits: 0,
      totalFocusEvents: 0,
      totalBlurEvents: 0,
      avgReadPercentage: 0,
    });
    
    if (aggregateData && data && data.length > 0) {
      aggregateData.avgReadPercentage = Math.round(aggregateData.avgReadPercentage / data.length);
    }
    
    // Format response based on whether we're returning aggregate or individual data
    const response = articleId || userId ? {
      aggregate: aggregateData,
      sessions: data?.map(session => ({
        id: session.id,
        sessionStart: session.session_start,
        sessionEnd: session.session_end,
        timeSpentSeconds: session.time_spent_seconds,
        aiRequestsCount: session.ai_requests_count,
        manualEditsCount: session.manual_edits_count,
        focusCount: session.focus_count,
        blurCount: session.blur_count,
        readPercentage: session.read_percentage,
        isActive: session.is_active,
        lastActive: session.last_active,
      }))
    } : {
      // For overall analytics, group by article
      articleMetrics: await getArticleMetrics(),
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in analytics API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getArticleMetrics() {
  try {
    // Fetch worker sessions with article info
    const { data, error } = await supabase
      .from('worker_analytics')
      .select('*')
      .order('session_start', { ascending: false })
      .limit(1000);
    
    if (error) {
      console.error('Error fetching article metrics:', error);
      return [];
    }
    
    // Group by article
    const articleMap = new Map();
    
    data?.forEach(session => {
      const articleId = session.article_id;
      if (!articleMap.has(articleId)) {
        articleMap.set(articleId, {
          articleId,
          title: session.article_title,
          totalSessions: 0,
          totalTimeSpent: 0,
          totalAiRequests: 0,
          avgReadPercentage: 0,
          readPercentageSum: 0,
          lastAccessed: session.session_start,
        });
      }
      
      const article = articleMap.get(articleId);
      article.totalSessions += 1;
      article.totalTimeSpent += session.time_spent_seconds || 0;
      article.totalAiRequests += session.ai_requests_count || 0;
      article.readPercentageSum += session.read_percentage || 0;
      
      if (new Date(session.session_start) > new Date(article.lastAccessed)) {
        article.lastAccessed = session.session_start;
      }
    });
    
    // Calculate averages and format response
    const metrics = Array.from(articleMap.values()).map(article => ({
      ...article,
      avgTimeSpent: Math.round(article.totalTimeSpent / article.totalSessions),
      avgReadPercentage: Math.round(article.readPercentageSum / article.totalSessions),
    }));
    
    // Sort by total time spent (most engaged articles first)
    metrics.sort((a, b) => b.totalTimeSpent - a.totalTimeSpent);
    
    return metrics;
  } catch (error) {
    console.error('Error calculating article metrics:', error);
    return [];
  }
}