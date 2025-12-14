import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const redirectTo = requestUrl.searchParams.get('redirect_to') ?? '/';

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    // If there's an error exchanging the code, send the user to update-password with details
    if (exchangeError) {
      const updatePasswordUrl = new URL('/auth/update-password', requestUrl.origin);
      updatePasswordUrl.searchParams.set('error', 'exchange_failed');
      updatePasswordUrl.searchParams.set('error_message', exchangeError.message);
      return NextResponse.redirect(updatePasswordUrl);
    }

    // If no session is returned, treat as expired/invalid
    if (!data.session) {
      const updatePasswordUrl = new URL('/auth/update-password', requestUrl.origin);
      updatePasswordUrl.searchParams.set('error', 'session_missing');
      updatePasswordUrl.searchParams.set('error_message', 'Reset link expired or already used.');
      return NextResponse.redirect(updatePasswordUrl);
    }
  }

  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
}


