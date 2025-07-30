import Anthropic from '@anthropic-ai/sdk';
import { Stream } from '@anthropic-ai/sdk/streaming';
import { ClaudeMessage, ClaudeResponse } from './claude-types';
import { claudeRateLimiter } from './claude-rate-limiter';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export type { ClaudeMessage, ClaudeResponse } from './claude-types';

// Format messages for Claude API
export function formatMessages(messages: ClaudeMessage[]): Anthropic.MessageParam[] {
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));
}

// Create a completion with Claude
export async function createCompletion(
  messages: ClaudeMessage[],
  systemPrompt: string,
  maxTokens: number = 4096
): Promise<ClaudeResponse> {
  try {
    // Estimate tokens (rough approximation)
    const estimatedTokens = messages.reduce((sum, msg) => sum + msg.content.length / 4, 0) + maxTokens;
    await claudeRateLimiter.acquireSlot(estimatedTokens);
    
    const response = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: formatMessages(messages),
    });

    const result = {
      id: response.id,
      content: response.content[0].type === 'text' ? response.content[0].text : '',
      stop_reason: response.stop_reason || 'completed',
      model: response.model,
      usage: response.usage,
    };

    // Release slot with actual token usage
    claudeRateLimiter.releaseSlot(response.usage?.input_tokens + response.usage?.output_tokens);

    return result;
  } catch (error) {
    claudeRateLimiter.releaseSlot();
    console.error('Claude API Error:', error);
    throw handleClaudeError(error);
  }
}

// Create a streaming completion with Claude
export async function createStreamingCompletion(
  messages: ClaudeMessage[],
  systemPrompt: string,
  maxTokens: number = 4096
): Promise<Stream<Anthropic.MessageStreamEvent>> {
  try {
    // Estimate tokens (rough approximation)
    const estimatedTokens = messages.reduce((sum, msg) => sum + msg.content.length / 4, 0) + maxTokens;
    await claudeRateLimiter.acquireSlot(estimatedTokens);
    
    const stream = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: formatMessages(messages),
      stream: true,
    });

    // Note: Token usage will be tracked when stream completes
    // The API route should handle releasing the rate limit slot
    
    return stream;
  } catch (error) {
    claudeRateLimiter.releaseSlot();
    console.error('Claude Streaming API Error:', error);
    throw handleClaudeError(error);
  }
}

// Error handling for Claude API
function handleClaudeError(error: any): Error {
  if (error instanceof Anthropic.APIError) {
    switch (error.status) {
      case 401:
        return new Error('Invalid API key. Please check your ANTHROPIC_API_KEY environment variable.');
      case 429:
        return new Error('Rate limit exceeded. Please try again later.');
      case 500:
      case 502:
      case 503:
        return new Error('Claude API is temporarily unavailable. Please try again later.');
      default:
        return new Error(`Claude API error: ${error.message}`);
    }
  }
  
  if (error instanceof Error) {
    return error;
  }
  
  return new Error('An unexpected error occurred while calling Claude API');
}

// Helper function to convert streaming response to text
export async function streamToText(stream: Stream<Anthropic.MessageStreamEvent>): Promise<string> {
  let fullText = '';
  
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      fullText += event.delta.text;
    }
  }
  
  return fullText;
}