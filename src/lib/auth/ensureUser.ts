import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type Supabase = SupabaseClient<Database>
type UserRow = Database['public']['Tables']['users']['Row']
type UserInsert = Database['public']['Tables']['users']['Insert']
type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']

/**
 * Supabase上にアプリ用のユーザー行を保証するヘルパー。
 * ログイン直後の利用者に対して users / user_profiles の初期レコードを作成する。
 */
export async function ensureUserRecords(
  supabase: Supabase,
  authUid: string,
  defaultTimezone = 'Asia/Tokyo'
) : Promise<UserRow> {
  const supabaseAny = supabase as unknown as SupabaseClient<any>

  // 既存ユーザーを確認
  const { data: existingUser, error: selectError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_uid', authUid)
    .maybeSingle()

  if (selectError) {
    throw new Error(`Failed to fetch user profile: ${selectError.message}`)
  }

  let userRecord: UserRow | null = existingUser

  if (!userRecord) {
    const newUser: UserInsert = {
      auth_uid: authUid,
      timezone: defaultTimezone,
    }

    const { data, error: insertError } = await supabaseAny
      .from('users')
      .insert(newUser)
      .select('*')
      .single()

    if (insertError || !data) {
      throw new Error(`Failed to create user profile: ${insertError?.message ?? 'Unknown error'}`)
    }

    userRecord = data
  }

  if (!userRecord) {
    throw new Error('User record is unavailable after creation')
  }

  // user_profiles の初期化
  const { data: userProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userRecord.id)
    .maybeSingle()

  if (profileError && profileError.code !== 'PGRST116') {
    throw new Error(`Failed to fetch user profile extension: ${profileError.message}`)
  }

  if (!userProfile) {
    const newProfile: UserProfileInsert = {
      user_id: userRecord.id,
      activity_level: 'moderate',
    }

    const { error: profileInsertError } = await supabaseAny
      .from('user_profiles')
      .insert(newProfile)

    if (profileInsertError && profileInsertError.code !== '23505') {
      throw new Error(`Failed to create user profile extension: ${profileInsertError.message}`)
    }
  }

  return userRecord
}


