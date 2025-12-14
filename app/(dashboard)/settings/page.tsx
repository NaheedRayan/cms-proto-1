import { createClient } from '@/lib/supabase/server';
import { SettingsClient } from '@/components/settings-client';
import { redirect } from 'next/navigation';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your store preferences and branding.
        </p>
      </div>

      <SettingsClient settings={settings} userId={user.id} />
    </div>
  );
}
