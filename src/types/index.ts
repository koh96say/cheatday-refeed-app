import { Database } from './database'

// Supabaseの型をエクスポート
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// 便利な型エイリアス
export type User = Tables<'users'>
export type MetricDaily = Tables<'metrics_daily'>
export type Score = Tables<'scores'>
export type Recommendation = Tables<'recommendations'>





