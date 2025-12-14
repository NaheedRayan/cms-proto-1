import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirectTo = searchParams.get('redirect_to') ?? '/'

  if (code) {
    const cookieStore = await cookies()
    const supabase = await createClient()
    
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    // If there's an error exchanging the code, send the user to update-password with details
    if (exchangeError) {
      const updatePasswordUrl = new URL('/auth/update-password', origin)
      updatePasswordUrl.searchParams.set('error', 'exchange_failed')
      updatePasswordUrl.searchParams.set('error_message', exchangeError.message)
      return NextResponse.redirect(updatePasswordUrl)
    }

    // If no session is returned, treat as expired/invalid
    if (!data.session) {
      const updatePasswordUrl = new URL('/auth/update-password', origin)
      updatePasswordUrl.searchParams.set('error', 'session_missing')
      updatePasswordUrl.searchParams.set('error_message', 'Reset link expired or already used.')
      return NextResponse.redirect(updatePasswordUrl)
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL(redirectTo, origin))
}
