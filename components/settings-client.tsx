'use client';

import { useState, useRef } from 'react';
import { Trash, Save, Upload, Image as ImageIcon } from 'lucide-react';
import { Button, Input, Card, CardContent, CardHeader, CardTitle, Textarea, Separator } from './ui';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Settings {
  id: number;
  store_name: string;
  description: string | null;
  logo_url: string | null;
  support_email: string | null;
}

interface SettingsClientProps {
  settings: Settings | null;
  userId: string;
}

export function SettingsClient({ settings, userId }: SettingsClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [name, setName] = useState(settings?.store_name || 'My Store');
  const [description, setDescription] = useState(settings?.description || '');
  const [supportEmail, setSupportEmail] = useState(settings?.support_email || '');
  const [logoUrl, setLogoUrl] = useState(settings?.logo_url || '');
  const [loading, setLoading] = useState(false);

  const onSave = async () => {
    if (!name) return;
    setLoading(true);
    
    try {
      await supabase
        .from('store_settings')
        .upsert({
          id: 1,
          store_name: name,
          description,
          support_email: supportEmail,
          logo_url: logoUrl
        });
      
      router.refresh();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    const confirm = window.confirm(
      "Are you sure you want to delete this store? This action cannot be undone and will remove all associated data."
    );
    
    if (!confirm) return;

    setLoading(true);
    try {
      // Delete store settings (cascade will handle related data)
      await supabase
        .from('store_settings')
        .delete()
        .eq('id', 1);
      
      // Sign out and redirect
      await supabase.auth.signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Failed to delete store:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, upload to Supabase Storage
      // For now, create a blob URL
      const fakeUrl = URL.createObjectURL(file);
      setLogoUrl(fakeUrl);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Store Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload Section */}
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium leading-none">Store Logo</label>
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-md border bg-white flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt="Store Logo" className="h-full w-full object-contain p-2" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Logo
                </Button>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleLogoUpload}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Recommended size: 512x512px
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium leading-none">Store Name</label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Store Name" 
              disabled={loading}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium leading-none">Description</label>
            <Textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Short description of your store..." 
              disabled={loading}
              className="resize-none"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This will be displayed on your public storefront.
            </p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium leading-none">Support Email</label>
            <Input 
              type="email"
              value={supportEmail} 
              onChange={(e) => setSupportEmail(e.target.value)} 
              placeholder="support@example.com" 
              disabled={loading}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={onSave} disabled={loading}>
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Store</p>
              <p className="text-sm text-muted-foreground">
                Deleting this store is irreversible and will remove all associated data.
              </p>
            </div>
            <Button variant="destructive" onClick={onDelete} disabled={loading}>
              <Trash className="mr-2 h-4 w-4" /> Delete Store
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
