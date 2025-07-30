import { useState, useCallback } from 'react';
import { claudeClient } from '@/lib/claude-client';
import { ClaudeMessage, ClaudeResponse, ClaudeStreamChunk } from '@/lib/claude-types';

interface UseClaudeOptions {
  systemPrompt?: string;
  maxTokens?: number;
  context?: string;
  onStreamChunk?: (chunk: ClaudeStreamChunk) => void;
}

interface UseClaudeReturn {
  messages: ClaudeMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string, streaming?: boolean) => Promise<void>;
  clearMessages: () => void;
  streamingText: string;
}

export function useClaude(options: UseClaudeOptions = {}): UseClaudeReturn {
  const [messages, setMessages] = useState<ClaudeMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState('');

  const sendMessage = useCallback(
    async (content: string, streaming = false) => {
      setIsLoading(true);
      setError(null);
      setStreamingText('');

      const newMessages = [...messages, { role: 'user' as const, content }];
      setMessages(newMessages);

      try {
        if (streaming) {
          let fullText = '';
          await claudeClient.sendStreamingMessage(
            newMessages,
            (chunk) => {
              fullText += chunk.text;
              setStreamingText(fullText);
              options.onStreamChunk?.(chunk);
            },
            {
              systemPrompt: options.systemPrompt,
              maxTokens: options.maxTokens,
              context: options.context,
            }
          );

          // Add the complete response to messages
          setMessages([...newMessages, { role: 'assistant', content: fullText }]);
          setStreamingText('');
        } else {
          const response = await claudeClient.sendMessage(newMessages, {
            systemPrompt: options.systemPrompt,
            maxTokens: options.maxTokens,
            context: options.context,
          });

          setMessages([...newMessages, { role: 'assistant', content: response.content }]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        // Remove the user message if there was an error
        setMessages(messages);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, options]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setStreamingText('');
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    streamingText,
  };
}