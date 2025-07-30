import { supabase } from '@/lib/supabase'
import type { Article, ArticleUpdate, ArticleResponse, ArticlesResponse } from '@/types/article'

/**
 * Fetches all articles with status 'draft'
 * @returns Promise with articles array or error
 */
export async function fetchDraftArticles(): Promise<ArticlesResponse> {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('status', 'draft')
      .order('updated_at', { ascending: false })

    if (error) {
      throw error
    }

    return {
      data: data as Article[],
      error: null
    }
  } catch (error) {
    console.error('Error fetching draft articles:', error)
    return {
      data: null,
      error: error as Error
    }
  }
}

/**
 * Updates an article's content by ID
 * @param id - The article UUID
 * @param content - The new content
 * @returns Promise with updated article or error
 */
export async function updateArticle(id: string, content: string): Promise<ArticleResponse> {
  try {
    if (!id) {
      throw new Error('Article ID is required')
    }

    if (content === undefined || content === null) {
      throw new Error('Content is required')
    }

    const { data, error } = await supabase
      .from('articles')
      .update({ 
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return {
      data: data as Article,
      error: null
    }
  } catch (error) {
    console.error('Error updating article:', error)
    return {
      data: null,
      error: error as Error
    }
  }
}

/**
 * Fetches a single article by ID
 * @param id - The article UUID
 * @returns Promise with article or error
 */
export async function getArticleById(id: string): Promise<ArticleResponse> {
  try {
    if (!id) {
      throw new Error('Article ID is required')
    }

    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      throw error
    }

    return {
      data: data as Article,
      error: null
    }
  } catch (error) {
    console.error('Error fetching article:', error)
    return {
      data: null,
      error: error as Error
    }
  }
}

/**
 * Updates multiple fields of an article
 * @param id - The article UUID
 * @param updates - Object containing fields to update
 * @returns Promise with updated article or error
 */
export async function updateArticleFields(id: string, updates: ArticleUpdate): Promise<ArticleResponse> {
  try {
    if (!id) {
      throw new Error('Article ID is required')
    }

    if (!updates || Object.keys(updates).length === 0) {
      throw new Error('No updates provided')
    }

    const { data, error } = await supabase
      .from('articles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return {
      data: data as Article,
      error: null
    }
  } catch (error) {
    console.error('Error updating article fields:', error)
    return {
      data: null,
      error: error as Error
    }
  }
}