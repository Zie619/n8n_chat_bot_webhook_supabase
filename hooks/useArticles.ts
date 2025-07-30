import { useState, useEffect, useCallback } from 'react'
import { Article } from '@/types/article'
import toast from 'react-hot-toast'

interface UseArticlesOptions {
  status?: 'draft' | 'final'
  limit?: number
  offset?: number
  autoFetch?: boolean
}

interface UseArticlesReturn {
  articles: Article[]
  total: number
  isLoading: boolean
  error: Error | null
  fetchArticles: () => Promise<void>
  refetch: () => Promise<void>
  hasMore: boolean
  loadMore: () => Promise<void>
}

export function useArticles(options: UseArticlesOptions = {}): UseArticlesReturn {
  const {
    status = 'draft',
    limit = 10,
    offset = 0,
    autoFetch = true
  } = options

  const [articles, setArticles] = useState<Article[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [currentOffset, setCurrentOffset] = useState(offset)

  const fetchArticles = useCallback(async (isLoadMore = false) => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({
        status,
        limit: limit.toString(),
        offset: (isLoadMore ? currentOffset : offset).toString()
      })

      const response = await fetch(`/api/articles?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch articles')
      }

      const data = await response.json()
      const newArticles = data.articles || []
      
      if (isLoadMore) {
        setArticles(prev => [...prev, ...newArticles])
      } else {
        setArticles(newArticles)
      }
      
      setTotal(data.total || 0)
      
      if (isLoadMore) {
        setCurrentOffset(prev => prev + limit)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch articles'
      setError(new Error(errorMessage))
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [status, limit, offset, currentOffset])

  const refetch = useCallback(async () => {
    setCurrentOffset(offset)
    await fetchArticles(false)
  }, [fetchArticles, offset])

  const loadMore = useCallback(async () => {
    await fetchArticles(true)
  }, [fetchArticles])

  const hasMore = articles.length < total

  useEffect(() => {
    if (autoFetch) {
      fetchArticles(false)
    }
  }, [autoFetch, status]) // Only refetch when status changes

  return {
    articles,
    total,
    isLoading,
    error,
    fetchArticles: () => fetchArticles(false),
    refetch,
    hasMore,
    loadMore
  }
}

// Hook for single article
interface UseArticleReturn {
  article: Article | null
  isLoading: boolean
  error: Error | null
  updateArticle: (update: Partial<Article>) => Promise<void>
  deleteArticle: () => Promise<void>
}

export function useArticle(articleId: string | null): UseArticleReturn {
  const [article, setArticle] = useState<Article | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchArticle = useCallback(async () => {
    if (!articleId) {
      setArticle(null)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/articles/${articleId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch article')
      }

      const data = await response.json()
      setArticle(data.article)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch article'
      setError(new Error(errorMessage))
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [articleId])

  const updateArticle = useCallback(async (update: Partial<Article>) => {
    if (!articleId) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/articles/${articleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(update)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update article')
      }

      const data = await response.json()
      setArticle(data.article)
      toast.success('Article updated successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update article'
      setError(new Error(errorMessage))
      toast.error(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [articleId])

  const deleteArticle = useCallback(async () => {
    if (!articleId) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/articles/${articleId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete article')
      }

      setArticle(null)
      toast.success('Article deleted successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete article'
      setError(new Error(errorMessage))
      toast.error(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [articleId])

  useEffect(() => {
    fetchArticle()
  }, [fetchArticle])

  return {
    article,
    isLoading,
    error,
    updateArticle,
    deleteArticle
  }
}