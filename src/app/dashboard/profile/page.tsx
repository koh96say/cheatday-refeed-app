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
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-12 px-6 pb-16 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted">Profile</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">プロフィール設定</h1>
          <p className="mt-2 text-sm text-muted">目標や生活状況に合わせてプロフィール情報を更新してください。</p>
        </div>
      </div>

      <div className="app-card p-8">
        <ProfileForm authUserEmail={user.email ?? ''} userId={userRecord.id} userInfo={pii} profile={profile} />
      </div>
    </div>
  )
}


