import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { DiffGenerator } from '@/lib/diff-generator';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: Message[];
  articleContent: string;
  articleContext?: {
    title?: string;
    wordCount?: number;
  };
}

interface ChatResponse {
  message: string;
  suggestedEdit?: {
    original: string;
    modified: string;
    diff: any;
    explanation: string;
  };
  conversationId?: string;
}

async function callClaude(messages: Message[], articleContent: string, articleContext?: any) {
  console.log('🟡 callClaude function started');
  
  const systemMessage = `You are a helpful AI writing assistant integrated into an article editor. You help users improve their content through friendly conversation.

Current article content:
"""
${articleContent}
"""

Article context:
- Title: ${articleContext?.title || 'Untitled'}
- Word count: ${articleContext?.wordCount || articleContent.split(/\s+/).length}

IMPORTANT: Always use proper markdown formatting in your suggestions:
- Use # for main headings (e.g., # Main Title)
- Use ## for section headings (e.g., ## Section)
- Use ### for subsections (e.g., ### Subsection)
- Use - or * for bullet points (NOT • or other symbols)
- Use 1. 2. 3. for numbered lists
- Use \`\`\` for code blocks
- Use > for blockquotes
- Use **bold** and *italic* for emphasis

When users ask for edits or improvements:
1. Be conversational and friendly
2. Explain your suggestions clearly
3. When proposing changes to the article, you MUST:
   - Find the EXACT text in the article that needs to be changed
   - Include only the specific paragraph or section being modified
   - Use this format:
   
   [SUGGESTED_EDIT_START]
   <original>The exact paragraph or section from the article</original>
   <modified>The same paragraph/section with your changes</modified>
   <explanation>Why this change improves the content</explanation>
   [SUGGESTED_EDIT_END]

CRITICAL RULES:
- The <original> must be an EXACT match from the article (including line breaks)
- For ADDING new paragraphs: Find the paragraph BEFORE where you want to insert, include it in <original>, then in <modified> show both the original paragraph AND the new paragraph
- For DELETING content: Include the exact text to delete in <original>, leave <modified> empty or with surrounding context
- For line breaks: Include actual line breaks in both <original> and <modified> to maintain formatting
- NEVER include the entire article, only the specific section being changed

Examples:
- To add a paragraph after "Hello world": 
  <original>Hello world</original>
  <modified>Hello world

This is a new paragraph</modified>

You can have normal conversation too, but when edits are requested, use the format above.
Always be encouraging and helpful!`;

  console.log('🟡 Sending request to Claude API');
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      system: systemMessage,
      messages: messages,
    }),
  });

  console.log('🟡 Claude API response status:', response.status);

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Claude API error:', error);
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log('🟡 Claude API success, response length:', data.content[0].text.length);
  return data.content[0].text;
}

function extractSuggestedEdit(response: string): { message: string; suggestedEdit?: any } {
  const editMatch = response.match(/\[SUGGESTED_EDIT_START\]([\s\S]*?)\[SUGGESTED_EDIT_END\]/);
  
  if (!editMatch) {
    return { message: response };
  }

  const editContent = editMatch[1];
  const originalMatch = editContent.match(/<original>([\s\S]*?)<\/original>/);
  const modifiedMatch = editContent.match(/<modified>([\s\S]*?)<\/modified>/);
  const explanationMatch = editContent.match(/<explanation>([\s\S]*?)<\/explanation>/);

  if (!originalMatch || !modifiedMatch) {
    // Log for debugging
    console.log('Failed to parse edit suggestion:', editContent.substring(0, 200));
    return { message: response };
  }

  const original = originalMatch[1].trim();
  const modified = modifiedMatch[1].trim();
  const explanation = explanationMatch ? explanationMatch[1].trim() : '';

  // Remove the edit block from the message
  const message = response.replace(/\[SUGGESTED_EDIT_START\][\s\S]*?\[SUGGESTED_EDIT_END\]/, '').trim();

  // Generate diff
  const diffGenerator = new DiffGenerator();
  const diff = diffGenerator.generate(original, modified);

  return {
    message: message || explanation || "I've prepared a suggested edit for you:",
    suggestedEdit: {
      original,
      modified,
      diff,
      explanation
    }
  };
}

export async function POST(req: NextRequest) {
  console.log('🔵 Claude chat API called');
  
  try {
    // Check authentication
    const authHeader = req.headers.get('authorization');
    console.log('🔵 Auth header present:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing auth header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const authPayload = verifyToken(token);
    if (!authPayload) {
      console.error('❌ Invalid token');
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const body: ChatRequest = await req.json();
    const { messages, articleContent, articleContext } = body;
    console.log('🔵 Request body received:', {
      messageCount: messages?.length,
      hasContent: !!articleContent,
      hasContext: !!articleContext
    });

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    if (!articleContent || typeof articleContent !== 'string') {
      return NextResponse.json({ error: 'Article content is required' }, { status: 400 });
    }

    // Check for API key
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({
        error: 'AI features are not configured. Please set up the Anthropic API key.',
      }, { status: 503 });
    }

    logger.info('Processing chat request', {
      userId: authPayload.userId,
      messageCount: messages.length,
      hasContext: !!articleContext
    });

    // Call Claude API
    console.log('🔵 Calling Claude API...');
    const claudeResponse = await callClaude(messages, articleContent, articleContext);
    console.log('🔵 Claude response received:', claudeResponse.substring(0, 100) + '...');
    
    // Extract any suggested edits
    const result = extractSuggestedEdit(claudeResponse);
    console.log('🔵 Extracted result:', {
      hasMessage: !!result.message,
      hasSuggestedEdit: !!result.suggestedEdit
    });

    logger.info('Chat response generated', {
      userId: authPayload.userId,
      hasEdit: !!result.suggestedEdit
    });

    return NextResponse.json({
      success: true,
      ...result
    } as ChatResponse);

  } catch (error) {
    logger.error('Claude chat API error', error as Error);
    
    if (error instanceof Error && error.message.includes('Claude API error')) {
      return NextResponse.json(
        { error: error.message },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}