# Claude API Integration

This document describes the Claude API integration for the xfunnel application.

## Overview

The Claude integration provides:
- Streaming and non-streaming API responses
- Built-in rate limiting
- Error handling and retry logic
- TypeScript types for type safety
- React hooks for easy component integration

## Setup

1. Add your Anthropic API key to your environment variables:
```bash
ANTHROPIC_API_KEY=your-api-key-here
```

## Usage

### API Route

The Claude API is available at `/api/claude` and accepts POST requests with the following structure:

```typescript
{
  messages: ClaudeMessage[];
  systemPrompt?: string;  // Optional, defaults to article editor prompt
  stream?: boolean;       // Enable streaming responses
  maxTokens?: number;     // Maximum tokens in response (default: 4096)
  context?: string;       // Additional context for the system prompt
}
```

### Client-Side Usage

#### Using the React Hook

```typescript
import { useClaude } from '@/hooks/useClaude';

function ArticleEditor() {
  const { messages, isLoading, error, sendMessage, streamingText } = useClaude({
    systemPrompt: 'Custom prompt here',
    maxTokens: 2000,
  });

  const handleSubmit = async (text: string) => {
    await sendMessage(text, true); // true for streaming
  };

  return (
    // Your component UI
  );
}
```

#### Using the Client Directly

```typescript
import { claudeClient } from '@/lib/claude-client';

// Non-streaming request
const response = await claudeClient.sendMessage([
  { role: 'user', content: 'Help me improve this article...' }
]);

// Streaming request
await claudeClient.sendStreamingMessage(
  messages,
  (chunk) => {
    console.log('Received chunk:', chunk.text);
  }
);
```

## Rate Limiting

The integration includes automatic rate limiting:
- Maximum 50 requests per minute
- Maximum 40,000 tokens per minute
- Maximum 5 concurrent requests

The rate limiter automatically queues requests when limits are reached.

## Error Handling

The integration handles common errors:
- Invalid API key (401)
- Rate limit exceeded (429)
- Server errors (500, 502, 503)

Errors are properly typed and include helpful messages.

## Types

Key TypeScript types:

```typescript
interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  id: string;
  content: string;
  stop_reason: string;
  model: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}
```

## System Prompts

Pre-configured prompts are available in `lib/claude-prompts.ts`:
- `ARTICLE_EDITOR_PROMPT` - For article editing
- `CONTENT_ANALYZER_PROMPT` - For content analysis
- `TITLE_GENERATOR_PROMPT` - For title generation
- `SUMMARY_GENERATOR_PROMPT` - For summary creation

## Best Practices

1. Always handle errors gracefully
2. Use streaming for long responses
3. Provide clear system prompts
4. Monitor token usage
5. Cache responses when appropriate