// Next.js App Router用のSupabaseクライアント
// サーバーコンポーネントとクライアントコンポーネントの両方に対応

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createSupabaseServerComponentClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set(name, value)
          // Server Components cannot modify the outgoing response directly.
          // We rely on middleware/api routes to propagate cookie options.
        },
        remove(name: string) {
          cookieStore.delete(name)
        },
      },
    }
  )
}





