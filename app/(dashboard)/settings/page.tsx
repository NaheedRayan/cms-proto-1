import { createClient } from '@/lib/supabase/client';
import { SettingsClient } from '@/components/settings-client';
import { redirect } from 'next/navigation';

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: settingsData } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const settings = settingsData?.map((setting: any) => ({
    ...setting,
    user_id: setting.user_id,
    store_name: setting.store_name,
    description: setting.description,
    logo_url: setting.logo_url,
    support_email: setting.support_email,
  }));

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
