import { useCallback, useEffect } from 'react'
import { useChatStore } from '@/stores/chatStore'
import { ChatMessage, ChatResponse, ChatSession } from '@/types/chat'
import toast from 'react-hot-toast'

interface UseChatOptions {
  articleId?: string
  systemPrompt?: string
  model?: string
  temperature?: number
  maxTokens?: number
}

interface UseChatReturn {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  sendMessage: (content: string) => Promise<void>
  clearMessages: () => void
  sessions: ChatSession[]
  currentSessionId: string | null
  createSession: (articleId: string) => void
  switchSession: (sessionId: string) => void
  deleteSession: (sessionId: string) => void
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const {
    articleId,
    systemPrompt = 'You are a helpful AI assistant.',
    model = 'claude-3-sonnet-20240229',
    temperature = 0.7,
    maxTokens = 2048
  } = options

  const {
    currentSession,
    sessions,
    isLoading,
    error,
    addMessage,
    setLoading,
    setError,
    createSession,
    loadSession,
    deleteSession,
    updateMessage,
    clearSession
  } = useChatStore()
  
  const messages = currentSession?.messages || []
  const currentSessionId = currentSession?.id || null

  // Create or switch to session for article
  useEffect(() => {
    if (articleId) {
      const existingSession = sessions.find(s => s.articleId === articleId)
      if (existingSession) {
        loadSession(existingSession.id)
      } else {
        createSession(articleId)
      }
    }
  }, [articleId, sessions, createSession, loadSession])

  const sendMessage = useCallback(async (content: string) => {
    try {
      setLoading(true)
      setError(null)

      // Add user message
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: new Date()
      }
      addMessage(userMessage)

      // Prepare messages for API
      const apiMessages = [
        {
          role: 'system' as const,
          content: systemPrompt
        },
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user' as const,
          content
        }
      ]

      // Call Claude API
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: apiMessages,
          model,
          temperature,
          max_tokens: maxTokens
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get response from Claude')
      }

      const data: ChatResponse = await response.json()
      
      if (!data.content) {
        throw new Error('No response from Claude')
      }

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date()
      }
      addMessage(assistantMessage)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
      toast.error(errorMessage)
      
      // Add error message
      const errorMsg: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}`,
        timestamp: new Date()
      }
      addMessage(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [messages, systemPrompt, model, temperature, maxTokens, addMessage, setLoading, setError])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages: clearSession,
    sessions,
    currentSessionId,
    createSession,
    switchSession: loadSession,
    deleteSession
  }
}

// Hook for managing multiple chat sessions
export function useChatSessions() {
  const {
    sessions,
    currentSession,
    createSession,
    loadSession,
    deleteSession,
    clearSession
  } = useChatStore()

  const currentSessionId = currentSession?.id || null

  return {
    sessions,
    currentSession,
    currentSessionId,
    createSession,
    switchSession: loadSession,
    deleteSession,
    clearAllSessions: clearSession
  }
}