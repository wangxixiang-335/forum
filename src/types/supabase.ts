export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          level: number
          experience_points: number
          created_at: string
        }
        Insert: {
          id: string
          username: string
          avatar_url?: string | null
          level?: number
          experience_points?: number
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          avatar_url?: string | null
          level?: number
          experience_points?: number
          created_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          tags: string[]
          like_count: number
          comment_count: number
          view_count: number
          is_pinned: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content: string
          tags?: string[]
          like_count?: number
          comment_count?: number
          view_count?: number
          is_pinned?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string
          tags?: string[]
          like_count?: number
          comment_count?: number
          view_count?: number
          is_pinned?: boolean
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          content: string
          parent_id: string | null
          like_count: number
          is_pinned: boolean
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          content: string
          parent_id?: string | null
          like_count?: number
          is_pinned?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          content?: string
          parent_id?: string | null
          like_count?: number
          is_pinned?: boolean
          created_at?: string
        }
      }
      interactions: {
        Row: {
          id: string
          user_id: string
          target_type: 'post' | 'comment'
          target_id: string
          interaction_type: 'like' | 'bookmark' | 'share'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          target_type: 'post' | 'comment'
          target_id: string
          interaction_type: 'like' | 'bookmark' | 'share'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          target_type?: 'post' | 'comment'
          target_id?: string
          interaction_type?: 'like' | 'bookmark' | 'share'
          created_at?: string
        }
      }
    }
  }
}