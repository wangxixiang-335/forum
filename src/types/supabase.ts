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
          signature: string | null
          theme_color: string
          created_at: string
        }
        Insert: {
          id: string
          username: string
          avatar_url?: string | null
          level?: number
          experience_points?: number
          signature?: string | null
          theme_color?: string
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          avatar_url?: string | null
          level?: number
          experience_points?: number
          signature?: string | null
          theme_color?: string
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
          has_images: boolean
          cover_image_url: string | null
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
          has_images?: boolean
          cover_image_url?: string | null
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
          has_images?: boolean
          cover_image_url?: string | null
          created_at?: string
        }
      }
      post_images: {
        Row: {
          id: string
          post_id: string
          user_id: string
          image_url: string
          file_name: string
          file_size: number
          mime_type: string
          width: number | null
          height: number | null
          alt_text: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          image_url: string
          file_name: string
          file_size: number
          mime_type: string
          width?: number | null
          height?: number | null
          alt_text?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          image_url?: string
          file_name?: string
          file_size?: number
          mime_type?: string
          width?: number | null
          height?: number | null
          alt_text?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
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