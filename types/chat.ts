export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  articleContext?: string
}

export interface ChatSession {
  id: string
  messages: ChatMessage[]
  articleId?: string
  createdAt: Date
  updatedAt: Date
}

export interface ChatResponse {
  content: string
  model?: string
  usage?: {
    input_tokens: number
    output_tokens: number
  }
  stop_reason?: string
}

export interface ChatError {
  message: string
  code?: string
  details?: any
}