import { useState, useEffect, useCallback } from 'react'

type SetValue<T> = T | ((prevValue: T) => T)

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: {
    serialize?: (value: T) => string
    deserialize?: (value: string) => T
  }
): [T, (value: SetValue<T>) => void, () => void] {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse
  } = options || {}

  // Get from local storage then parse stored json or return initialValue
  const readValue = useCallback((): T => {
    // Prevent build error "window is undefined"
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? deserialize(item) : initialValue
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  }, [initialValue, key, deserialize])

  const [storedValue, setStoredValue] = useState<T>(readValue)

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = useCallback((value: SetValue<T>) => {
    // Prevent build error "window is undefined"
    if (typeof window === 'undefined') {
      console.warn(`Tried to set localStorage key "${key}" but window is undefined`)
      return
    }

    try {
      // Allow value to be a function so we have the same API as useState
      const newValue = value instanceof Function ? value(storedValue) : value

      // Save to local storage
      window.localStorage.setItem(key, serialize(newValue))
      
      // Save state
      setStoredValue(newValue)
      
      // We dispatch a custom event so every useLocalStorage hook is notified
      window.dispatchEvent(new Event('local-storage'))
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error)
    }
  }, [key, serialize, storedValue])

  // Remove value from local storage
  const removeValue = useCallback(() => {
    // Prevent build error "window is undefined"
    if (typeof window === 'undefined') {
      console.warn(`Tried to remove localStorage key "${key}" but window is undefined`)
      return
    }

    try {
      window.localStorage.removeItem(key)
      setStoredValue(initialValue)
      
      // We dispatch a custom event so every useLocalStorage hook is notified
      window.dispatchEvent(new Event('local-storage'))
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error)
    }
  }, [initialValue, key])

  useEffect(() => {
    setStoredValue(readValue())
  }, [readValue])

  useEffect(() => {
    const handleStorageChange = () => {
      setStoredValue(readValue())
    }

    // This only works for other documents, not the current one
    window.addEventListener('storage', handleStorageChange)

    // This is a custom event, triggered in setValue and removeValue
    window.addEventListener('local-storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('local-storage', handleStorageChange)
    }
  }, [readValue])

  return [storedValue, setValue, removeValue]
}

// Specialized hook for storing chat sessions
export function useChatSessionStorage() {
  return useLocalStorage('xfunnel-chat-sessions', [], {
    serialize: (value) => JSON.stringify(value),
    deserialize: (value) => {
      try {
        const parsed = JSON.parse(value)
        // Convert date strings back to Date objects
        return parsed.map((session: any) => ({
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
          messages: session.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }))
      } catch {
        return []
      }
    }
  })
}

// Specialized hook for storing user preferences
interface UserPreferences {
  theme?: 'light' | 'dark' | 'system'
  autoSaveEnabled?: boolean
  autoSaveInterval?: number
  defaultArticleStatus?: 'draft' | 'final'
  chatModel?: string
  chatTemperature?: number
}

export function useUserPreferences() {
  const defaultPreferences: UserPreferences = {
    theme: 'system',
    autoSaveEnabled: true,
    autoSaveInterval: 30000,
    defaultArticleStatus: 'draft',
    chatModel: 'claude-3-sonnet-20240229',
    chatTemperature: 0.7
  }

  return useLocalStorage('xfunnel-preferences', defaultPreferences)
}