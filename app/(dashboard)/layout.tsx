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
  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user?.id)
    .maybeSingle();

  return (
    <DashboardShell
      settings={settings || { store_name: 'My Store', logo_url: null , user_email: user?.email}}
    >
      {children}
    </DashboardShell>
  );
}


