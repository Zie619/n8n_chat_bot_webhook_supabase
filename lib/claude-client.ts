// Client-side utilities for Claude API interactions

import { ClaudeMessage, ClaudeRequest, ClaudeResponse, ClaudeStreamChunk, isClaudeError } from './claude-types';

export class ClaudeClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/claude') {
    this.baseUrl = baseUrl;
  }

  // Send a non-streaming request to Claude
  async sendMessage(
    messages: ClaudeMessage[],
    options?: {
      systemPrompt?: string;
      maxTokens?: number;
      context?: string;
    }
  ): Promise<ClaudeResponse> {
    const request: ClaudeRequest = {
      messages,
      stream: false,
      ...options,
    };

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok || isClaudeError(data)) {
      throw new Error(data.error || 'Failed to get response from Claude');
    }

    return data as ClaudeResponse;
  }

  // Send a streaming request to Claude
  async sendStreamingMessage(
    messages: ClaudeMessage[],
    onChunk: (chunk: ClaudeStreamChunk) => void,
    options?: {
      systemPrompt?: string;
      maxTokens?: number;
      context?: string;
    }
  ): Promise<void> {
    const request: ClaudeRequest = {
      messages,
      stream: true,
      ...options,
    };

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to start streaming response');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body available');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            try {
              const chunk = JSON.parse(data) as ClaudeStreamChunk;
              onChunk(chunk);
            } catch (e) {
              console.error('Failed to parse SSE chunk:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // Helper method to format a conversation
  static formatConversation(userMessage: string, previousMessages?: ClaudeMessage[]): ClaudeMessage[] {
    const messages: ClaudeMessage[] = previousMessages || [];
    messages.push({ role: 'user', content: userMessage });
    return messages;
  }

  // Helper method to extract text from streaming chunks
  static extractTextFromChunks(chunks: ClaudeStreamChunk[]): string {
    return chunks.map(chunk => chunk.text).join('');
  }
}

// Default client instance
export const claudeClient = new ClaudeClient();