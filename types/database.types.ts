export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      modules: {
        Row: {
          id: string
          number: number
          title: string
          description: string | null
          estimated_duration_minutes: number
          is_active: boolean
          content: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          number: number
          title: string
          description?: string | null
          estimated_duration_minutes?: number
          is_active?: boolean
          content?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          number?: number
          title?: string
          description?: string | null
          estimated_duration_minutes?: number
          is_active?: boolean
          content?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      access_codes: {
        Row: {
          id: string
          code: string
          label: string | null
          is_active: boolean
          expires_at: string | null
          max_uses: number | null
          current_uses: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          label?: string | null
          is_active?: boolean
          expires_at?: string | null
          max_uses?: number | null
          current_uses?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          label?: string | null
          is_active?: boolean
          expires_at?: string | null
          max_uses?: number | null
          current_uses?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      participants: {
        Row: {
          id: string
          name: string
          access_code_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          access_code_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          access_code_id?: string
          created_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          participant_id: string
          module_id: string
          access_code_id: string
          status: string
          started_at: string
          completed_at: string | null
          duration_seconds: number | null
          score: number
          total_questions: number
          correct_answers: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          participant_id: string
          module_id: string
          access_code_id: string
          status?: string
          started_at?: string
          completed_at?: string | null
          duration_seconds?: number | null
          score?: number
          total_questions?: number
          correct_answers?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          participant_id?: string
          module_id?: string
          access_code_id?: string
          status?: string
          started_at?: string
          completed_at?: string | null
          duration_seconds?: number | null
          score?: number
          total_questions?: number
          correct_answers?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
