import { useState, useCallback, useEffect } from 'react'
import { Article } from '@/types/article'
import toast from 'react-hot-toast'
import { useAuth } from '@/app/components/AuthProvider'

interface UseArticleActionsOptions {
  onSaveSuccess?: (article: Article) => void
  onSaveError?: (error: Error) => void
  onSendSuccess?: (response: any) => void
  onSendError?: (error: Error) => void
}

interface UseArticleActionsReturn {
  // Save actions
  saveArticle: (article: Partial<Article>) => Promise<Article | null>
  updateArticle: (id: string, updates: Partial<Article>) => Promise<Article | null>
  deleteArticle: (id: string) => Promise<boolean>
  
  // Send actions
  sendToWebhook: (article: Article, webhookUrl: string) => Promise<any>
  sendToEmail: (article: Article, email: string) => Promise<boolean>
  exportArticle: (article: Article, format: 'json' | 'markdown' | 'html') => void
  
  // Loading states
  isSaving: boolean
  isSending: boolean
  isDeleting: boolean
  
  // Error states
  saveError: Error | null
  sendError: Error | null
  deleteError: Error | null
}

export function useArticleActions(options: UseArticleActionsOptions = {}): UseArticleActionsReturn {
  const { token } = useAuth()
  const { onSaveSuccess, onSaveError, onSendSuccess, onSendError } = options
  
  // Loading states
  const [isSaving, setIsSaving] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Error states
  const [saveError, setSaveError] = useState<Error | null>(null)
  const [sendError, setSendError] = useState<Error | null>(null)
  const [deleteError, setDeleteError] = useState<Error | null>(null)
  
  const saveArticle = useCallback(async (article: Partial<Article>): Promise<Article | null> => {
    if (!token) {
      toast.error('You must be logged in to save articles')
      return null
    }
    
    try {
      setIsSaving(true)
      setSaveError(null)

      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(article)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save article')
      }

      // The API returns the article directly, not wrapped in an object
      const savedArticle = await response.json()
      toast.success('Article saved successfully')
      onSaveSuccess?.(savedArticle)
      return savedArticle
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save article')
      setSaveError(error)
      toast.error(error.message)
      onSaveError?.(error)
      return null
    } finally {
      setIsSaving(false)
    }
  }, [token, onSaveSuccess, onSaveError])
  
  const updateArticle = useCallback(async (id: string, updates: Partial<Article>): Promise<Article | null> => {
    if (!token) {
      toast.error('You must be logged in to update articles')
      return null
    }
    
    try {
      setIsSaving(true)
      setSaveError(null)

      const response = await fetch(`/api/articles/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update article')
      }

      // The API returns the article directly, not wrapped in an object
      const updatedArticle = await response.json()
      toast.success('Article updated successfully')
      onSaveSuccess?.(updatedArticle)
      return updatedArticle
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update article')
      setSaveError(error)
      toast.error(error.message)
      onSaveError?.(error)
      return null
    } finally {
      setIsSaving(false)
    }
  }, [token, onSaveSuccess, onSaveError])
  
  const deleteArticle = useCallback(async (id: string): Promise<boolean> => {
    if (!token) {
      toast.error('You must be logged in to delete articles')
      return false
    }
    
    try {
      setIsDeleting(true)
      setDeleteError(null)

      // The API expects the ID as a query parameter, not a path parameter
      const response = await fetch(`/api/articles?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete article')
      }

      toast.success('Article deleted successfully')
      return true
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete article')
      setDeleteError(error)
      toast.error(error.message)
      return false
    } finally {
      setIsDeleting(false)
    }
  }, [token])
  
  const sendToWebhook = useCallback(async (article: Article, webhookUrl: string): Promise<any> => {
    if (!token) {
      toast.error('You must be logged in to send articles')
      return null
    }
    
    try {
      setIsSending(true)
      setSendError(null)

      const response = await fetch('/api/webhook', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ article, webhookUrl })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send to webhook')
      }

      const data = await response.json()
      toast.success('Article sent to webhook successfully')
      onSendSuccess?.(data)
      return data
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send to webhook')
      setSendError(error)
      toast.error(error.message)
      onSendError?.(error)
      return null
    } finally {
      setIsSending(false)
    }
  }, [token, onSendSuccess, onSendError])
  
  const sendToEmail = useCallback(async (article: Article, email: string): Promise<boolean> => {
    if (!token) {
      toast.error('You must be logged in to send articles')
      return false
    }
    
    try {
      setIsSending(true)
      setSendError(null)

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ article, email })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send email')
      }

      const data = await response.json()
      toast.success(`Article sent to ${email} successfully`)
      onSendSuccess?.(data)
      return true
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send email')
      setSendError(error)
      toast.error(error.message)
      onSendError?.(error)
      return false
    } finally {
      setIsSending(false)
    }
  }, [token, onSendSuccess, onSendError])
  
  const exportArticle = useCallback((article: Article, format: 'json' | 'markdown' | 'html') => {
    let content: string
    let mimeType: string
    let extension: string
    
    switch (format) {
      case 'json':
        content = JSON.stringify(article, null, 2)
        mimeType = 'application/json'
        extension = 'json'
        break
      case 'markdown':
        content = `# ${article.title}\n\n${article.content}`
        mimeType = 'text/markdown'
        extension = 'md'
        break
      case 'html':
        content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${article.title}</title>
</head>
<body>
  <h1>${article.title}</h1>
  ${article.content.split('\n').map(p => `<p>${p}</p>`).join('\n')}
</body>
</html>`
        mimeType = 'text/html'
        extension = 'html'
        break
    }
    
    // Create a blob and download it
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${article.title.toLowerCase().replace(/\s+/g, '-')}.${extension}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success(`Article exported as ${format.toUpperCase()}`)
  }, [])
  
  return {
    // Save actions
    saveArticle,
    updateArticle,
    deleteArticle,
    
    // Send actions
    sendToWebhook,
    sendToEmail,
    exportArticle,
    
    // Loading states
    isSaving,
    isSending,
    isDeleting,
    
    // Error states
    saveError,
    sendError,
    deleteError
  }
}