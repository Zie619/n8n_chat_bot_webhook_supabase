import { NextRequest, NextResponse } from 'next/server';
import { NaturalAIAssistant } from '@/lib/natural-ai-assistant';
import { AIAssistant, UserPreferences, Message, ArticleMetadata } from '@/lib/ai-assistant';
import { TextAnalysis, calculateTextMetrics, detectTone } from '@/lib/text-analysis';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  logger.debug('Claude v2 API request received');
  
  try {
    const body = await request.json();
    
    const { articleContent, userMessage, conversationHistory = [], userPreferences = {} } = body;
    
    logger.debug('Request metadata', { 
      articleLength: articleContent?.length || 0,
      historyLength: conversationHistory.length
    });

    if (!articleContent || !userMessage) {
      logger.error('Missing required fields in Claude v2 request');
      return NextResponse.json(
        { error: 'Missing required fields: articleContent and userMessage' },
        { status: 400 }
      );
    }

    // Analyze article to get metadata
    let textMetrics, sentimentAnalysis;
    
    try {
      textMetrics = calculateTextMetrics(articleContent);
    } catch (metricsError) {
      logger.warn('Error calculating text metrics', { error: metricsError });
      // Provide default metrics
      textMetrics = {
        wordCount: articleContent.split(/\s+/).length,
        sentenceCount: articleContent.split(/[.!?]+/).filter((s: string) => s.trim()).length,
        paragraphCount: articleContent.split('\n\n').filter((p: string) => p.trim()).length,
        averageWordLength: 5,
        averageSentenceLength: 20,
        complexWordCount: 0,
        readabilityScores: {
          flesch: 60,
          fleschKincaid: 8,
          gunningFog: 10,
          smog: 8,
          automatedReadability: 8
        }
      };
    }
    
    try {
      sentimentAnalysis = TextAnalysis.analyzeSentiment(articleContent);
    } catch (sentimentError) {
      logger.warn('Error analyzing sentiment', { error: sentimentError });
      // Provide default sentiment
      sentimentAnalysis = {
        overall: 'neutral',
        score: 0,
        emotions: {
          joy: 0,
          anger: 0,
          fear: 0,
          sadness: 0,
          surprise: 0,
          trust: 0
        }
      };
    }
    
    const paragraphs = articleContent.split('\n\n').filter((p: string) => p.trim());
    const sentences = articleContent.split(/[.!?]+/).filter((s: string) => s.trim());
    
    const metadata: ArticleMetadata = {
      id: 'current-article',
      title: 'Current Article',
      wordCount: textMetrics.wordCount,
      paragraphCount: paragraphs.length,
      sentenceCount: sentences.length,
      readabilityScore: textMetrics.readabilityScores.flesch,
      tone: detectTone(articleContent),
      topics: [],
      keywords: [], // Text analysis doesn't provide top words
      lastModified: new Date(),
      language: 'en',
      hasHeadings: articleContent.includes('#'),
      hasList: articleContent.includes('•') || articleContent.includes('-'),
      hasQuotes: articleContent.includes('"') || articleContent.includes('"'),
      sentiment: sentimentAnalysis.overall as 'positive' | 'negative' | 'neutral' | 'mixed'
    };

    // Convert conversation history
    const messages: Message[] = conversationHistory.map((msg: any) => ({
      id: msg.id || Date.now().toString(),
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp || Date.now())
    }));

    // Use the natural language AI assistant
    logger.debug('Creating NaturalAIAssistant');
    const naturalAssistant = new NaturalAIAssistant(articleContent, metadata, messages);
    
    const response = await naturalAssistant.processMessage(userMessage);
    logger.debug('Natural assistant response', {
      hasMessage: !!response.message,
      hasSuggestion: response.hasSuggestion,
      confidence: response.metadata?.confidence
    });

    // If the natural assistant has low confidence, fall back to the original assistant
    if (response.metadata?.confidence && response.metadata.confidence < 0.5) {
      logger.debug('Low confidence response, falling back to original assistant');
      const preferences: UserPreferences = {
        autoSuggest: true,
        preserveVoice: true,
        ...userPreferences
      };
      
      const originalAssistant = new AIAssistant(articleContent, messages, preferences);
      const fallbackResponse = await originalAssistant.processRequest(userMessage);
      
      // Merge responses, preferring the original assistant's suggestion
      return NextResponse.json({
        ...fallbackResponse,
        message: `I'll help you with that. ${fallbackResponse.message}`,
        metadata: {
          ...fallbackResponse.metadata,
          usedFallback: true
        }
      });
    }

    // Return the natural language response
    const finalResponse = {
      ...response,
      conversationHistory: [
        ...messages,
        {
          id: Date.now().toString(),
          role: 'user',
          content: userMessage,
          timestamp: new Date()
        },
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.message,
          timestamp: new Date()
        }
      ]
    };
    
    return NextResponse.json(finalResponse);

  } catch (error) {
    logger.error('Error in Claude v2 AI processing', error as Error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process AI request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}