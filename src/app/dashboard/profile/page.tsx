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
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-800">
            ← ダッシュボードに戻る
          </Link>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">プロフィール設定</h1>
          <p className="text-sm text-gray-600 mb-6">
            推定TDEEや身体情報を登録すると、リフィード提案が利用状況に合わせて最適化されます。
          </p>
          <ProfileForm authUserEmail={user.email ?? ''} userId={userRecord.id} userInfo={pii} profile={profile} />
        </div>
      </main>
    </div>
  )
}


