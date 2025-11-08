import { createSupabaseServerComponentClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerComponentClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}



