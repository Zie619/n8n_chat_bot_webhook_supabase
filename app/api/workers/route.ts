import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Create Supabase client for server-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    const articleId = request.nextUrl.searchParams.get('articleId');
    
    if (!userId || !articleId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: userId and articleId' },
        { status: 400 }
      );
    }
    
    // Get the most recent active session for this user/article
    const { data: sessions, error } = await supabase
      .from('workers')
      .select('*')
      .eq('user_id', userId)
      .eq('article_id', articleId)
      .is('session_end', null)  // Only active sessions
      .order('session_start', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('Error fetching session:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch session' },
        { status: 500 }
      );
    }
    
    const activeSession = sessions && sessions.length > 0 ? sessions[0] : null;
    
    return NextResponse.json({
      success: true,
      session: activeSession,
      sessionId: activeSession?.id || null
    });
  } catch (error) {
    console.error('Error in GET /api/workers:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Handle both regular JSON and beacon requests
    let data;
    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      data = await request.json();
    } else {
      // Handle beacon request (plain text JSON)
      const text = await request.text();
      data = JSON.parse(text);
    }
    
    
    // Validate required fields
    if (!data.articleId || !data.userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: articleId and userId' },
        { status: 400 }
      );
    }
    
    // Check for existing active session for this user/article combination
    const { data: existingSessions, error: fetchError } = await supabase
      .from('workers')
      .select('*')
      .eq('user_id', data.userId)
      .eq('article_id', data.articleId)
      .is('session_end', null)  // Only get active sessions (no end time)
      .order('session_start', { ascending: false })
      .limit(1);
    
    if (fetchError) {
      console.error('Error checking existing sessions:', fetchError);
    }
    
    const existingSession = existingSessions && existingSessions.length > 0 ? existingSessions[0] : null;
    
    // If we have a session ID in the request, try to update that specific session
    const sessionId = data.sessionId || (existingSession ? existingSession.id : null);
    
    if (sessionId && existingSession) {
      // Update existing session
      const updateData: any = {
        time_spent_seconds: Math.round(data.timeSpentSeconds),
        is_active: data.isActive !== undefined ? data.isActive : true,
        last_active: new Date().toISOString(),
      };
      
      // Add optional fields for update
      const optionalUpdateFields = {
        ai_requests_count: data.aiRequestsCount !== undefined ? data.aiRequestsCount : (existingSession.ai_requests_count || 0),
        manual_edits_count: data.manualEditsCount !== undefined ? data.manualEditsCount : (existingSession.manual_edits_count || 0),
        focus_count: data.focusCount !== undefined ? data.focusCount : (existingSession.focus_count || 0),
        blur_count: data.blurCount !== undefined ? data.blurCount : (existingSession.blur_count || 0),
        read_percentage: Math.max(data.readPercentage || 0, existingSession.read_percentage || 0),
      };
      
      
      Object.assign(updateData, optionalUpdateFields);
      
      // If session is being marked as inactive, set session_end
      if (data.isActive === false && !existingSession.session_end) {
        updateData.session_end = new Date().toISOString();
      }
      
      const { data: updatedData, error: updateError } = await supabase
        .from('workers')
        .update(updateData)
        .eq('id', sessionId)
        .select();
      
      
      if (updateError) {
        console.error('Error updating worker session:', updateError);
        
        // Try minimal update if full update fails
        const minimalUpdate = {
          time_spent_seconds: Math.round(data.timeSpentSeconds),
          last_active: new Date().toISOString(),
        };
        
        const { data: retryData, error: retryError } = await supabase
          .from('workers')
          .update(minimalUpdate)
          .eq('id', sessionId)
          .select();
        
        if (!retryError) {
          return NextResponse.json({ 
            success: true, 
            message: 'Session updated (minimal)',
            data: retryData,
            sessionId: sessionId,
            warning: 'Some metrics could not be updated.'
          });
        }
        
        return NextResponse.json(
          { success: false, error: 'Failed to update session', details: updateError.message },
          { status: 500 }
        );
      }
      
      
      return NextResponse.json({ 
        success: true, 
        message: 'Session updated successfully',
        data: updatedData,
        sessionId: sessionId
      });
      
    } else {
      // Create new session
      const workerData: any = {
        user_id: data.userId,
        article_id: data.articleId,
        session_start: data.sessionStart || new Date().toISOString(),
        time_spent_seconds: Math.round(data.timeSpentSeconds),
        is_active: data.isActive !== undefined ? data.isActive : true,
        last_active: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      // Add optional columns only if they might exist in the database
      const optionalFields = {
        ai_requests_count: data.aiRequestsCount || 0,
        manual_edits_count: data.manualEditsCount || 0,
        focus_count: data.focusCount || 0,
        blur_count: data.blurCount || 0,
        read_percentage: data.readPercentage || 0,
      };

      Object.assign(workerData, optionalFields);
      
      // Save to Supabase
      const { data: savedData, error } = await supabase
        .from('workers')
        .insert(workerData)
        .select();
      
      if (error) {
        console.error('Error creating worker session:', error);
        
        // If the error is about missing columns, try with minimal data
        if (error.message && error.message.includes('column')) {
          console.log('Retrying with minimal worker data...');
          const minimalData = {
            user_id: data.userId,
            article_id: data.articleId,
            session_start: data.sessionStart || new Date().toISOString(),
            time_spent_seconds: Math.round(data.timeSpentSeconds),
            created_at: new Date().toISOString(),
          };
          
          const { data: retryData, error: retryError } = await supabase
            .from('workers')
            .insert(minimalData)
            .select();
            
          if (!retryError) {
            console.log('Successfully created session with minimal data.');
            return NextResponse.json({ 
              success: true, 
              message: 'Session created (minimal)',
              data: retryData,
              sessionId: retryData?.[0]?.id,
              warning: 'Database schema may be outdated. Some metrics were not saved.'
            });
          }
        }
        
        return NextResponse.json(
          { success: false, error: 'Failed to create session', details: error.message },
          { status: 500 }
        );
      }
      
      
      return NextResponse.json({ 
        success: true, 
        message: 'Session created successfully',
        data: savedData,
        sessionId: savedData?.[0]?.id
      });
    }
  } catch (error) {
    console.error('Error processing worker session data:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to process session data' },
      { status: 500 }
    );
  }
}