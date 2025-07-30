import { create } from 'zustand'
import { ChatMessage, ChatSession } from '@/types/chat'
import { Article } from '@/types/article'

interface ChatState {
  // State
  currentSession: ChatSession | null
  sessions: ChatSession[]
  isLoading: boolean
  error: string | null
  currentArticle: Article | null
  
  // Actions
  createSession: (articleId?: string) => void
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  setCurrentArticle: (article: Article | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearSession: () => void
  loadSession: (sessionId: string) => void
  deleteSession: (sessionId: string) => void
  updateMessage: (messageId: string, content: string) => void
}

const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36)

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  currentSession: null,
  sessions: [],
  isLoading: false,
  error: null,
  currentArticle: null,
  
  // Create new chat session
  createSession: (articleId?: string) => {
    const newSession: ChatSession = {
      id: generateId(),
      messages: [],
      articleId,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    set(state => ({
      currentSession: newSession,
      sessions: [...state.sessions, newSession],
      error: null
    }))
  },
  
  // Add message to current session
  addMessage: (message) => {
    const state = get()
    if (!state.currentSession) {
      state.createSession()
    }
    
    const newMessage: ChatMessage = {
      ...message,
      id: generateId(),
      timestamp: new Date()
    }
    
    set(state => {
      if (!state.currentSession) return state
      
      return {
        currentSession: {
          ...state.currentSession,
          messages: [...state.currentSession.messages, newMessage],
          updatedAt: new Date()
        },
        sessions: state.sessions.map(session => 
          session.id === state.currentSession?.id
            ? {
                ...session,
                messages: [...session.messages, newMessage],
                updatedAt: new Date()
              }
            : session
        )
      }
    })
  },
  
  // Set current article context
  setCurrentArticle: (article) => {
    set({ currentArticle: article })
  },
  
  // Set loading state
  setLoading: (loading) => {
    set({ isLoading: loading })
  },
  
  // Set error state
  setError: (error) => {
    set({ error, isLoading: false })
  },
  
  // Clear current session
  clearSession: () => {
    set({ 
      currentSession: null,
      error: null,
      currentArticle: null
    })
  },
  
  // Load existing session
  loadSession: (sessionId) => {
    set(state => {
      const session = state.sessions.find(s => s.id === sessionId)
      return session ? { currentSession: session, error: null } : state
    })
  },
  
  // Delete session
  deleteSession: (sessionId) => {
    set(state => ({
      sessions: state.sessions.filter(s => s.id !== sessionId),
      currentSession: state.currentSession?.id === sessionId ? null : state.currentSession
    }))
  },
  
  // Update message content
  updateMessage: (messageId, content) => {
    set(state => {
      if (!state.currentSession) return state
      
      const updatedMessages = state.currentSession.messages.map(msg =>
        msg.id === messageId ? { ...msg, content } : msg
      )
      
      return {
        currentSession: {
          ...state.currentSession,
          messages: updatedMessages,
          updatedAt: new Date()
        },
        sessions: state.sessions.map(session =>
          session.id === state.currentSession?.id
            ? {
                ...session,
                messages: updatedMessages,
                updatedAt: new Date()
              }
            : session
        )
      }
    })
  }
}))