export interface Article {
  id: string
  title: string
  content: string
  status: 'draft' | 'final'
  updated_at: string
}

export type ArticleUpdate = Partial<Omit<Article, 'id'>>

export interface ArticleResponse {
  data: Article | null
  error: Error | null
}

export interface ArticlesResponse {
  data: Article[] | null
  error: Error | null
}