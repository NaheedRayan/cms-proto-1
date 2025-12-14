import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/supabase/types/database.types';

export async function assertStoreMembership(
  supabase: SupabaseClient<Database>,
  storeId: string,
  userId: string,
) {
  const { data } = await supabase
    .from('store_members')
    .select('id')
    .eq('store_id', storeId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
}
