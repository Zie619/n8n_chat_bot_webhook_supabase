import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/auth';

// Initialize Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
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

    // Parse request body
    const { articleId, title, content } = await request.json();
    
    // Validate required fields
    if (!articleId || !title) {
      return NextResponse.json(
        { error: 'Invalid request: articleId and title are required' },
        { status: 400 }
      );
    }

    // Update article and set last_edited_by
    let { data: article, error } = await supabase
      .from('articles')
      .update({
        title,
        content,
        last_edited_by: authPayload.userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', articleId)
      .select(`
        *,
        last_editor:users!articles_last_edited_by_fkey(id, email)
      `)
      .single();

    // If update fails due to missing column, try without last_edited_by
    if (error && error.message.includes('last_edited_by')) {
      console.log('Falling back to update without last_edited_by');
      const result = await supabase
        .from('articles')
        .update({
          title,
          content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', articleId)
        .select()
        .single();
      
      article = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Error saving article:', error);
      return NextResponse.json(
        { error: 'Failed to save article', details: error.message },
        { status: 500 }
      );
    }

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found or unauthorized' },
        { status: 404 }
      );
    }

    // Return the updated article
    return NextResponse.json(article);
  } catch (error) {
    console.error('Unexpected error in save-article route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}