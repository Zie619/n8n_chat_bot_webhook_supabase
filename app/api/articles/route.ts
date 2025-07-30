import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { withLogging } from '@/lib/logger';
import { AuthenticationError, ValidationError, ExternalServiceError, NotFoundError, formatErrorResponse } from '@/lib/error-handler';
import { getEnvVar } from '@/lib/env-validation';

// Initialize Supabase client for server-side operations
let supabase: any;
try {
  const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseServiceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY', getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', ''));
  
  supabase = createClient(supabaseUrl, supabaseServiceKey);
  logger.info('Supabase client initialized for articles API');
} catch (error) {
  logger.error('Failed to initialize Supabase client', error as Error);
  throw new ExternalServiceError('Database initialization failed');
}

export const GET = withLogging(async (request: NextRequest) => {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const authPayload = verifyToken(token);
    if (!authPayload) {
      throw new AuthenticationError('Invalid or expired token');
    }

    // Return demo articles for demo user
    if (authPayload.userId === 'demo-user-1') {
      const demoArticles = [
        {
          id: 'demo-article-1',
          user_id: 'demo-user-1',
          title: 'Welcome to xFunnel - Your AI-Powered Article Editor',
          content: `# Welcome to xFunnel!

This is a demo article showing the capabilities of our AI-powered article editor.

## Features

### 1. Rich Text Editing
- **Bold**, *italic*, and ~~strikethrough~~ text
- Bullet points and numbered lists
- Code blocks with syntax highlighting

### 2. AI Assistant
Click the "Ask Claude" button to get AI assistance with:
- Content suggestions
- Grammar improvements
- Research help
- Creative ideas

### 3. Real-time Saving
Your articles are automatically saved as you type.

### 4. Export Options
Send your finished articles to external systems via webhook integration.

## Example Code Block

\`\`\`javascript
function greetUser(name) {
  return \`Hello, \${name}! Welcome to xFunnel.\`;
}

console.log(greetUser('Demo User'));
\`\`\`

## Try It Out!

Feel free to edit this article or create a new one. In demo mode, changes won't be saved permanently.

---

*This is a demo article created for demonstration purposes.*`,
          status: 'published',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          word_count: 150,
          last_editor: {
            id: 'demo-user-1',
            email: 'user@user.com'
          }
        },
        {
          id: 'demo-article-2',
          user_id: 'demo-user-1',
          title: 'Getting Started with AI Writing',
          content: `# Getting Started with AI Writing

Learn how to leverage AI to enhance your writing process.

## Benefits of AI-Assisted Writing

1. **Speed**: Generate content ideas quickly
2. **Quality**: Improve grammar and style
3. **Creativity**: Explore new angles and perspectives

## Best Practices

- Always review AI suggestions
- Maintain your unique voice
- Use AI as a tool, not a replacement

Try clicking "Ask Claude" to see AI assistance in action!`,
          status: 'draft',
          created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          word_count: 75,
          last_editor: {
            id: 'demo-user-1',
            email: 'user@user.com'
          }
        }
      ];
      
      logger.info('Returning demo articles for demo user');
      return NextResponse.json(demoArticles);
    }

    // Extract and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (isNaN(limit) || limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }
    
    if (isNaN(offset) || offset < 0) {
      throw new ValidationError('Offset must be a non-negative number');
    }

    // Fetch articles with last_editor information
    let { data: articles, error, count } = await supabase
      .from('articles')
      .select(`
        *,
        last_editor:users!articles_last_edited_by_fkey(id, email)
      `, { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // If the join fails, try without it
    if (error && (error.message.includes('relation') || error.message.includes('foreign key'))) {
      logger.info('Complex join failed, falling back to simple select');
      ({ data: articles, error, count } = await supabase
        .from('articles')
        .select('*', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1));
    }

    if (error) {
      logger.error('Error fetching articles from database', error);
      throw new ExternalServiceError('Database query failed', error);
    }

    logger.info('Articles fetched successfully', { 
      userId: authPayload.userId, 
      articlesCount: articles?.length || 0 
    });

    // Return articles directly as an array for simplicity
    return NextResponse.json(articles || []);
  } catch (error) {
    const errorResponse = formatErrorResponse(error as Error);
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode });
  }
});

// Handle POST requests to create new articles
export const POST = withLogging(async (request: NextRequest) => {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const authPayload = verifyToken(token);
    if (!authPayload) {
      throw new AuthenticationError('Invalid or expired token');
    }

    // Get and validate article data from request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      throw new ValidationError('Invalid JSON in request body');
    }
    
    const { title, content } = body;
    
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      throw new ValidationError('Title is required and must be a non-empty string');
    }
    
    if (title.length > 200) {
      throw new ValidationError('Title must be 200 characters or less');
    }
    
    logger.info('Creating new article', { 
      userId: authPayload.userId, 
      titleLength: title.length,
      hasContent: !!content 
    });

    // Create new article with automatic schema detection
    let article;
    let error;
    
    // Try with all available columns first
    const fullData = {
      user_id: authPayload.userId,
      created_by: authPayload.userId,
      last_edited_by: authPayload.userId,
      title: title.trim(),
      content: content || '',
      status: 'draft',
      word_count: content ? content.split(/\s+/).length : 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    ({ data: article, error } = await supabase
      .from('articles')
      .insert(fullData)
      .select('*')
      .single());

    // If new schema fails, try old schema (user_id)
    if (error && (error.code === '42703' || error.code === '42P01')) { // Column does not exist or relation does not exist
      logger.info('New schema failed, trying fallback with user_id column', {
        errorCode: error.code,
        errorMessage: error.message
      });
      
      const fallbackData = {
        user_id: authPayload.userId,
        title: title.trim(),
        content: content || '',
        status: 'draft',
      };
      
      ({ data: article, error } = await supabase
        .from('articles')
        .insert(fallbackData)
        .select('*')  // Simplified select without join
        .single());
      
      // Add fields for frontend consistency
      if (article && !error) {
        article.created_by = authPayload.userId;
        article.last_edited_by = authPayload.userId;
      }
    }
    
    // If both fail, try minimal insert
    if (error) {
      logger.info('Both schemas failed, trying minimal insert', {
        errorCode: error.code,
        errorMessage: error.message
      });
      
      const minimalData = {
        title: title.trim(),
        content: content || '',
      };
      
      ({ data: article, error } = await supabase
        .from('articles')
        .insert(minimalData)
        .select('*')
        .single());
        
      // Add user info if successful
      if (article && !error) {
        article.created_by = authPayload.userId;
        article.last_edited_by = authPayload.userId;
        article.user_id = authPayload.userId;
      }
    }

    if (error) {
      logger.error('Failed to create article after all attempts', error, {
        userId: authPayload.userId,
        errorCode: error.code,
        errorHint: error.hint,
        errorDetails: error.details,
        errorMessage: error.message
      });
      
      // Provide more specific error message
      let errorMessage = 'Failed to create article';
      if (error.code === '42P01') {
        errorMessage = 'Articles table not found in database';
      } else if (error.code === '23502') {
        errorMessage = 'Required column is missing in articles table';
      } else if (error.code === '42703') {
        errorMessage = 'Column does not exist in articles table';
      }
      
      throw new ExternalServiceError(errorMessage, error);
    }

    logger.info('Article created successfully', {
      userId: authPayload.userId,
      articleId: article.id
    });

    return NextResponse.json(article);
  } catch (error) {
    const errorResponse = formatErrorResponse(error as Error);
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode });
  }
});

// Handle PUT requests to update articles
export const PUT = withLogging(async (request: NextRequest) => {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const authPayload = verifyToken(token);
    if (!authPayload) {
      throw new AuthenticationError('Invalid or expired token');
    }

    // Get article data from request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      throw new ValidationError('Invalid JSON in request body');
    }

    const { id, title, content } = body;

    if (!id) {
      throw new ValidationError('Article ID is required');
    }

    // Update article
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Try with new schema first
    updateData.last_edited_by = authPayload.userId;

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;

    let { data: article, error } = await supabase
      .from('articles')
      .update(updateData)
      .eq('id', id)
      .select('*, last_editor:users!last_edited_by(id, email)')
      .single();

    // If update fails due to missing column, try without last_edited_by
    if (error && error.code === '42703') {
      logger.info('New schema update failed, trying without last_edited_by');
      delete updateData.last_edited_by;
      
      ({ data: article, error } = await supabase
        .from('articles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single());
    }

    if (error) {
      logger.error('Failed to update article', error, {
        userId: authPayload.userId,
        articleId: id
      });
      throw new ExternalServiceError('Database operation failed', error);
    }

    if (!article) {
      throw new NotFoundError('Article');
    }

    logger.info('Article updated successfully', {
      userId: authPayload.userId,
      articleId: id
    });

    return NextResponse.json(article);
  } catch (error) {
    const errorResponse = formatErrorResponse(error as Error);
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode });
  }
});

// Handle DELETE requests
export const DELETE = withLogging(async (request: NextRequest) => {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const authPayload = verifyToken(token);
    if (!authPayload) {
      throw new AuthenticationError('Invalid or expired token');
    }

    // Get article ID from URL
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      throw new ValidationError('Article ID is required');
    }

    // Delete article
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Failed to delete article', error, {
        userId: authPayload.userId,
        articleId: id
      });
      throw new ExternalServiceError('Database operation failed', error);
    }

    logger.info('Article deleted successfully', {
      userId: authPayload.userId,
      articleId: id
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorResponse = formatErrorResponse(error as Error);
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode });
  }
});