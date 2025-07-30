import { useEffect, useRef, useState, useCallback } from 'react'
import toast from 'react-hot-toast'

interface UseWebSocketOptions {
  url: string
  onMessage?: (data: any) => void
  onOpen?: () => void
  onClose?: () => void
  onError?: (error: Event) => void
  reconnect?: boolean
  reconnectInterval?: number
  reconnectAttempts?: number
}

interface UseWebSocketReturn {
  isConnected: boolean
  sendMessage: (data: any) => void
  connect: () => void
  disconnect: () => void
  lastMessage: any
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    url,
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnect = true,
    reconnectInterval = 3000,
    reconnectAttempts = 5
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<any>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectCountRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    try {
      // Close existing connection
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close()
      }

      // Create new WebSocket connection
      wsRef.current = new WebSocket(url)

      wsRef.current.onopen = () => {
        setIsConnected(true)
        reconnectCountRef.current = 0
        onOpen?.()
        toast.success('Connected to real-time updates')
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setLastMessage(data)
          onMessage?.(data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      wsRef.current.onclose = () => {
        setIsConnected(false)
        onClose?.()
        
        // Attempt to reconnect
        if (reconnect && reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++
          toast.error(`Connection lost. Reconnecting... (${reconnectCountRef.current}/${reconnectAttempts})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        } else if (reconnectCountRef.current >= reconnectAttempts) {
          toast.error('Failed to reconnect. Please refresh the page.')
        }
      }

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        onError?.(error)
      }
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      toast.error('Failed to connect to real-time updates')
    }
  }, [url, onMessage, onOpen, onClose, onError, reconnect, reconnectInterval, reconnectAttempts])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setIsConnected(false)
  }, [])

  const sendMessage = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    } else {
      console.warn('WebSocket is not connected')
      toast.error('Not connected. Please wait...')
    }
  }, [])

  // Connect on mount
  useEffect(() => {
    connect()
    
    // Cleanup on unmount
    return () => {
      disconnect()
    }
  }, []) // Empty deps intentionally - we only want to connect once on mount

  return {
    isConnected,
    sendMessage,
    connect,
    disconnect,
    lastMessage
  }
}

// Hook for real-time article updates
interface UseRealtimeArticlesOptions {
  onArticleUpdate?: (article: any) => void
  onArticleDelete?: (articleId: string) => void
}

export function useRealtimeArticles(options: UseRealtimeArticlesOptions = {}) {
  const { onArticleUpdate, onArticleDelete } = options
  
  const handleMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'article:update':
        onArticleUpdate?.(data.article)
        break
      case 'article:delete':
        onArticleDelete?.(data.articleId)
        break
      default:
        console.log('Unknown message type:', data.type)
    }
  }, [onArticleUpdate, onArticleDelete])

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'
  
  return useWebSocket({
    url: `${wsUrl}/articles`,
    onMessage: handleMessage,
    reconnect: true
  })
}