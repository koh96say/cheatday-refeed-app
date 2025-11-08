// データベース型定義
// このファイルはSupabase CLIで自動生成することも可能

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
      users: {
        Row: {
          id: string
          auth_uid: string
          gender: 'male' | 'female' | 'other' | null
          birth_year: number | null
          height_cm: number | null
          goal_weight: number | null
          timezone: string
          created_at: string
        }
        Insert: {
          id?: string
          auth_uid: string
          gender?: 'male' | 'female' | 'other' | null
          birth_year?: number | null
          height_cm?: number | null
          goal_weight?: number | null
          timezone?: string
          created_at?: string
        }
        Update: {
          id?: string
          auth_uid?: string
          gender?: 'male' | 'female' | 'other' | null
          birth_year?: number | null
          height_cm?: number | null
          goal_weight?: number | null
          timezone?: string
          created_at?: string
        }
      }
      metrics_daily: {
        Row: {
          id: number
          user_id: string
          date: string
          weight_kg: number | null
          rhr_bpm: number | null
          temp_c: number | null
          hrv_ms: number | null
          sleep_min: number | null
          fatigue_1_5: number | null
          training_load: number | null
          notes: string | null
        }
        Insert: {
          id?: number
          user_id: string
          date: string
          weight_kg?: number | null
          rhr_bpm?: number | null
          temp_c?: number | null
          hrv_ms?: number | null
          sleep_min?: number | null
          fatigue_1_5?: number | null
          training_load?: number | null
          notes?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          date?: string
          weight_kg?: number | null
          rhr_bpm?: number | null
          temp_c?: number | null
          hrv_ms?: number | null
          sleep_min?: number | null
          fatigue_1_5?: number | null
          training_load?: number | null
          notes?: string | null
        }
      }
      scores: {
        Row: {
          user_id: string
          date: string
          plateau_flag: boolean | null
          mas: number | null
          rrs: number | null
        }
        Insert: {
          user_id: string
          date: string
          plateau_flag?: boolean | null
          mas?: number | null
          rrs?: number | null
        }
        Update: {
          user_id?: string
          date?: string
          plateau_flag?: boolean | null
          mas?: number | null
          rrs?: number | null
        }
      }
      recommendations: {
        Row: {
          id: number
          user_id: string
          date: string
          kcal_total: number | null
          carb_g: number | null
          protein_g: number | null
          fat_g: number | null
          duration_days: number
          rationale_json: Json | null
        }
        Insert: {
          id?: number
          user_id: string
          date: string
          kcal_total?: number | null
          carb_g?: number | null
          protein_g?: number | null
          fat_g?: number | null
          duration_days?: number
          rationale_json?: Json | null
        }
        Update: {
          id?: number
          user_id?: string
          date?: string
          kcal_total?: number | null
          carb_g?: number | null
          protein_g?: number | null
          fat_g?: number | null
          duration_days?: number
          rationale_json?: Json | null
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





