import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type Supabase = SupabaseClient<Database>

/**
 * Supabase上にアプリ用のユーザー行を保証するヘルパー。
 * ログイン直後の利用者に対して users / user_profiles の初期レコードを作成する。
 */
export async function ensureUserRecords(
  supabase: Supabase,
  authUid: string,
  defaultTimezone = 'Asia/Tokyo'
) {
  // 既存ユーザーを確認
  const { data: existingUser, error: selectError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_uid', authUid)
    .maybeSingle()

  if (selectError) {
    throw new Error(`Failed to fetch user profile: ${selectError.message}`)
  }

  let userRecord = existingUser

  if (!userRecord) {
    const { data, error: insertError } = await supabase
      .from('users')
      .insert({
        auth_uid: authUid,
        timezone: defaultTimezone,
      })
      .select('*')
      .single()

    if (insertError || !data) {
      throw new Error(`Failed to create user profile: ${insertError?.message ?? 'Unknown error'}`)
    }

    userRecord = data
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
    const { error: profileInsertError } = await supabase.from('user_profiles').insert({
      user_id: userRecord.id,
      activity_level: 'moderate',
    })

    if (profileInsertError && profileInsertError.code !== '23505') {
      throw new Error(`Failed to create user profile extension: ${profileInsertError.message}`)
    }
  }

  return userRecord
}


