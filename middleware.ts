import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';
import {createClient} from "@/lib/supabase/server"
import { NextResponse } from 'next/server';
import { time } from 'console';

export async function middleware(request: NextRequest) {
  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  
  const startTime = performance.now();
  const supabase = await createClient();
  const { data } = await (await supabase).auth.getClaims()
  const user = data?.claims
  const endTime = performance.now();
  console.log(`***Time taken: ${endTime - startTime} ms`);


  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
