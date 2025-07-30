// Type definitions for Claude API integration

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeRequest {
  messages: ClaudeMessage[];
  systemPrompt?: string;
  stream?: boolean;
  maxTokens?: number;
  context?: string;
}

export interface EditSuggestion {
  type: 'insert' | 'replace' | 'delete' | 'format' | 'restructure';
  originalText?: string;
  suggestedText?: string;
  position?: number;
  reason?: string;
}

export interface ContentAnalysis {
  readabilityScore: number;
  sentenceComplexity: 'simple' | 'moderate' | 'complex';
  tone: 'formal' | 'casual' | 'professional' | 'academic';
  suggestions: EditSuggestion[];
}

export interface ClaudeResponse {
  id: string;
  content: string;
  stop_reason: string;
  model: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  // Extended fields for article editing
  message?: string;
  suggestedContent?: string | null;
  hasSuggestion?: boolean;
  analysis?: Partial<ContentAnalysis>;
}

export interface ClaudeStreamChunk {
  text: string;
}

export interface ClaudeError {
  error: string;
  status?: number;
  details?: any;
}

// API configuration types
export interface ClaudeAPIConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

// Rate limiting types
export interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  concurrentRequests: number;
}

export interface RateLimitStatus {
  remainingRequests: number;
  remainingTokens: number;
  resetTime: Date;
}

// Helper type guards
export function isClaudeError(response: any): response is ClaudeError {
  return response && typeof response.error === 'string';
}

export function isClaudeResponse(response: any): response is ClaudeResponse {
  return response && typeof response.id === 'string' && typeof response.content === 'string';
}