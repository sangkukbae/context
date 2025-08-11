// Supabase Database Types
// Auto-generated types for Supabase client
// These should be generated using `supabase gen types typescript` command

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar: string | null
          email_verified: string | null
          created_at: string
          updated_at: string
          preferences: Json
          subscription_plan: 'free' | 'pro' | 'team'
          subscription_status: 'active' | 'canceled' | 'past_due' | null
          subscription_current_period_end: string | null
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          avatar?: string | null
          email_verified?: string | null
          created_at?: string
          updated_at?: string
          preferences?: Json
          subscription_plan?: 'free' | 'pro' | 'team'
          subscription_status?: 'active' | 'canceled' | 'past_due' | null
          subscription_current_period_end?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar?: string | null
          email_verified?: string | null
          created_at?: string
          updated_at?: string
          preferences?: Json
          subscription_plan?: 'free' | 'pro' | 'team'
          subscription_status?: 'active' | 'canceled' | 'past_due' | null
          subscription_current_period_end?: string | null
        }
      }
      notes: {
        Row: {
          id: string
          content: string
          user_id: string
          cluster_id: string | null
          created_at: string
          updated_at: string
          metadata: Json
          embedding: number[] | null
          embedding_updated_at: string | null
        }
        Insert: {
          id?: string
          content: string
          user_id: string
          cluster_id?: string | null
          created_at?: string
          updated_at?: string
          metadata?: Json
          embedding?: number[] | null
          embedding_updated_at?: string | null
        }
        Update: {
          id?: string
          content?: string
          user_id?: string
          cluster_id?: string | null
          created_at?: string
          updated_at?: string
          metadata?: Json
          embedding?: number[] | null
          embedding_updated_at?: string | null
        }
      }
      clusters: {
        Row: {
          id: string
          title: string
          description: string | null
          user_id: string
          created_at: string
          updated_at: string
          confidence: number
          note_count: number
          total_words: number
          themes: Json
          suggested_at: string | null
          accepted_at: string | null
          dismissed_at: string | null
          status: 'suggested' | 'accepted' | 'dismissed'
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          user_id: string
          created_at?: string
          updated_at?: string
          confidence?: number
          note_count?: number
          total_words?: number
          themes?: Json
          suggested_at?: string | null
          accepted_at?: string | null
          dismissed_at?: string | null
          status?: 'suggested' | 'accepted' | 'dismissed'
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string
          confidence?: number
          note_count?: number
          total_words?: number
          themes?: Json
          suggested_at?: string | null
          accepted_at?: string | null
          dismissed_at?: string | null
          status?: 'suggested' | 'accepted' | 'dismissed'
        }
      }
      documents: {
        Row: {
          id: string
          title: string
          content: string
          user_id: string
          cluster_id: string | null
          status: 'draft' | 'published' | 'archived'
          created_at: string
          updated_at: string
          word_count: number
          reading_time: number
          tags: Json
          version: number
          is_public: boolean
          share_id: string | null
          allow_comments: boolean
          share_expires_at: string | null
          share_password_hash: string | null
        }
        Insert: {
          id?: string
          title: string
          content: string
          user_id: string
          cluster_id?: string | null
          status?: 'draft' | 'published' | 'archived'
          created_at?: string
          updated_at?: string
          word_count?: number
          reading_time?: number
          tags?: Json
          version?: number
          is_public?: boolean
          share_id?: string | null
          allow_comments?: boolean
          share_expires_at?: string | null
          share_password_hash?: string | null
        }
        Update: {
          id?: string
          title?: string
          content?: string
          user_id?: string
          cluster_id?: string | null
          status?: 'draft' | 'published' | 'archived'
          created_at?: string
          updated_at?: string
          word_count?: number
          reading_time?: number
          tags?: Json
          version?: number
          is_public?: boolean
          share_id?: string | null
          allow_comments?: boolean
          share_expires_at?: string | null
          share_password_hash?: string | null
        }
      }
      search_index: {
        Row: {
          id: string
          entity_id: string
          entity_type: string
          user_id: string
          content: string
          title: string | null
          tags: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          entity_id: string
          entity_type: string
          user_id: string
          content: string
          title?: string | null
          tags?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          entity_id?: string
          entity_type?: string
          user_id?: string
          content?: string
          title?: string | null
          tags?: Json
          created_at?: string
          updated_at?: string
        }
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          entity_type: string
          entity_id: string | null
          metadata: Json
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          entity_type: string
          entity_id?: string | null
          metadata?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          entity_type?: string
          entity_id?: string | null
          metadata?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      job_queue: {
        Row: {
          id: string
          type: 'embedding' | 'clustering' | 'document_generation'
          status: 'pending' | 'processing' | 'completed' | 'failed'
          payload: Json
          result: Json | null
          error: string | null
          attempts: number
          max_attempts: number
          created_at: string
          updated_at: string
          scheduled_for: string | null
        }
        Insert: {
          id?: string
          type: 'embedding' | 'clustering' | 'document_generation'
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          payload?: Json
          result?: Json | null
          error?: string | null
          attempts?: number
          max_attempts?: number
          created_at?: string
          updated_at?: string
          scheduled_for?: string | null
        }
        Update: {
          id?: string
          type?: 'embedding' | 'clustering' | 'document_generation'
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          payload?: Json
          result?: Json | null
          error?: string | null
          attempts?: number
          max_attempts?: number
          created_at?: string
          updated_at?: string
          scheduled_for?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      // Vector similarity search function
      similarity_search: {
        Args: {
          query_embedding: number[]
          match_threshold: number
          match_count: number
          user_id?: string
        }
        Returns: {
          id: string
          content: string
          metadata: Json
          similarity: number
        }[]
      }
    }
    Enums: {
      user_subscription_plan: 'free' | 'pro' | 'team'
      user_subscription_status: 'active' | 'canceled' | 'past_due'
      cluster_status: 'suggested' | 'accepted' | 'dismissed'
      document_status: 'draft' | 'published' | 'archived'
      job_status: 'pending' | 'processing' | 'completed' | 'failed'
      job_type: 'embedding' | 'clustering' | 'document_generation'
    }
  }
}

// Helper type for JSON columns
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// Type helpers for Supabase client
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// Convenience type aliases
export type User = Tables<'users'>
export type Note = Tables<'notes'>
export type Cluster = Tables<'clusters'>
export type Document = Tables<'documents'>
export type SearchIndex = Tables<'search_index'>
export type ActivityLog = Tables<'activity_logs'>
export type JobQueue = Tables<'job_queue'>

export type UserInsert = TablesInsert<'users'>
export type NoteInsert = TablesInsert<'notes'>
export type ClusterInsert = TablesInsert<'clusters'>
export type DocumentInsert = TablesInsert<'documents'>

export type UserUpdate = TablesUpdate<'users'>
export type NoteUpdate = TablesUpdate<'notes'>
export type ClusterUpdate = TablesUpdate<'clusters'>
export type DocumentUpdate = TablesUpdate<'documents'>

// Real-time subscription types
export type RealtimePayload<T> = {
  commit_timestamp: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T
  old: T
  schema: string
  table: string
}

// Auth types for Supabase Auth
export interface Profile {
  id: string
  email: string
  name: string | null
  avatar: string | null
  created_at: string
  updated_at: string
}

export interface AuthSession {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  user: AuthUser
}

export interface AuthUser {
  id: string
  email: string
  email_confirmed_at?: string
  phone?: string
  confirmed_at?: string
  last_sign_in_at?: string
  app_metadata: {
    provider: string
    providers: string[]
  }
  user_metadata: {
    name?: string
    avatar_url?: string
  }
  role: string
  created_at: string
  updated_at: string
}

// Vector search result types
export interface VectorSearchResult {
  id: string
  content: string
  metadata: Json
  similarity: number
  created_at: string
  updated_at: string
}

// Combined search result types
export interface HybridSearchResult {
  id: string
  type: 'note' | 'document'
  content: string
  title?: string
  tags: string[]
  similarity?: number
  text_rank?: number
  combined_rank: number
  created_at: string
  updated_at: string
}

// Database function types
export type DatabaseFunctions = Database['public']['Functions']
export type SimilaritySearchArgs = DatabaseFunctions['similarity_search']['Args']
export type SimilaritySearchResult = DatabaseFunctions['similarity_search']['Returns']
