import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerComponentClient } from '@/lib/supabase/server'
import { ensureUserRecords } from '@/lib/auth/ensureUser'
import ProfileForm from '@/components/dashboard/ProfileForm'

export default async function ProfilePage() {
  const supabase = await createSupabaseServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const userRecord = await ensureUserRecords(supabase, user.id)

  const [{ data: pii }, { data: profile }] = await Promise.all([
    supabase.from('users').select('gender, birth_year, height_cm, goal_weight, timezone').eq('id', userRecord.id).single(),
    supabase
      .from('user_profiles')
      .select('activity_level, estimated_tdee, body_fat_percentage')
      .eq('user_id', userRecord.id)
      .single(),
  ])

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted">Profile</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">プロフィールと代謝設定</h1>
          <p className="mt-2 text-sm text-muted">
            推定TDEEや身体情報を更新すると、提案されるカロリー配分があなたのコンディションに合わせて最適化されます。
          </p>
        </div>
        <Link href="/dashboard" className="app-button-secondary text-xs uppercase tracking-wide">
          ダッシュボードへ戻る
        </Link>
      </div>

      <div className="app-card p-8">
        <ProfileForm authUserEmail={user.email ?? ''} userId={userRecord.id} userInfo={pii} profile={profile} />
      </div>
    </div>
  )
}


