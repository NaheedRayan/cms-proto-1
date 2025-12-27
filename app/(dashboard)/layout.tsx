import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard-shell';
import { createClient } from '@/lib/supabase/server';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const user = claims

  if (!user) {
    redirect('/auth/login');
  }
  // Get user settings for branding
  const { data: storeSettings } = await supabase
    .from('store_settings')
    .select('*')
    .eq('user_id', user?.id)
    .maybeSingle();

  return (
    <DashboardShell
      settings={storeSettings || { store_name: storeSettings?.store_name, logo_url: storeSettings?.logo_url , user_email: user?.email}}
    >
      {children}
    </DashboardShell>
  );
}


