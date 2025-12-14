// 'use client';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { JwtPayload } from '@supabase/supabase-js';

// get claims from supabase in a
const getClaims = async () => {
  const supabase = await createClient();
  const {data, error} = await (await supabase).auth.getClaims();
  return data?.claims;
}


export default async function HomePage() {

  // show claims in a nice formatted way
  const claims = await getClaims();
  
  // return <div>{JSON.stringify(claims, null, 2)}</div>;
  return redirect('/overview');

}
