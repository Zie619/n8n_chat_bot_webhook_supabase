export interface Database {
  public: {
    Tables: {
      articles: {
        Row: {
          id: string
          title: string
          content: string
          status: 'draft' | 'final'
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          status?: 'draft' | 'final'
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          status?: 'draft' | 'final'
          updated_at?: string
        }
      }
    }
  }
}