import { NextRequest, NextResponse } from 'next/server';
import { AIAssistant, UserPreferences, Message } from '@/lib/ai-assistant';
import { TextAnalysis } from '@/lib/text-analysis';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for Claude API
    const clientId = getClientIdentifier(request);
    const { success, remaining, reset } = await rateLimit(clientId, 'claude');
    
    if (!success) {
      return NextResponse.json(
        { 
          error: 'AI rate limit exceeded. Please wait before making more requests.',
          retryAfter: Math.ceil((reset - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(reset).toISOString()
          }
        }
      );
    }
    
    const body = await request.json();
    const { articleContent, userMessage, conversationHistory = [], userPreferences = {} } = body;

    // Convert conversation history to the format expected by AI Assistant
    const messages: Message[] = conversationHistory.map((msg: any) => ({
      id: msg.id || Date.now().toString(),
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp || Date.now())
    }));

    // Initialize user preferences with defaults
    const preferences: UserPreferences = {
      autoSuggest: true,
      preserveVoice: true,
      ...userPreferences
    };

    // Create AI Assistant instance
    const assistant = new AIAssistant(articleContent, messages, preferences);

    // Process the user's request
    const response = await assistant.processRequest(userMessage);

    // Get enhanced metadata
    const articleMetadata = assistant.getArticleMetadata();
    const textMetrics = TextAnalysis.calculateMetrics(articleContent);
    const sentimentAnalysis = TextAnalysis.analyzeSentiment(articleContent);
    const qualityMetrics = TextAnalysis.analyzeQuality(articleContent);
    // Prepare enhanced response
    const apiResponse = {
      message: response.message,
      suggestedContent: response.suggestedContent,
      hasSuggestion: response.hasSuggestion,
      commands: response.commands,
      metadata: {
        ...response.metadata,
        articleAnalysis: {
          wordCount: articleMetadata.wordCount,
          readabilityScore: articleMetadata.readabilityScore,
          tone: articleMetadata.tone,
          sentiment: articleMetadata.sentiment,
          topics: articleMetadata.topics,
          keywords: articleMetadata.keywords
        },
        textMetrics: {
          readabilityScores: textMetrics.readabilityScores,
          complexWordCount: textMetrics.complexWordCount,
          averageSentenceLength: textMetrics.averageSentenceLength
        },
        sentiment: sentimentAnalysis,
        quality: qualityMetrics
      },
      analysis: response.analysis,
      usage: {
        input_tokens: 150 + (conversationHistory.length * 50),
        output_tokens: 250,
        total_tokens: 400 + (conversationHistory.length * 50)
      }
    };
    
    console.log('Sending enhanced AI response:', { 
      hasSuggestion: response.hasSuggestion,
      commandType: response.commands?.[0]?.action,
      confidence: response.metadata?.confidence,
      suggestedContentLength: response.suggestedContent?.length,
      messageLength: response.message.length,
      articleTone: articleMetadata.tone,
      readabilityScore: articleMetadata.readabilityScore
    });

    // Simulate a slight delay for more natural interaction
    await new Promise(resolve => setTimeout(resolve, 300));

    return NextResponse.json(apiResponse);
  } catch (error) {
    console.error('Error in Claude route:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}