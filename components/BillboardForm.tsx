'use client';

import { useState } from 'react';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash, Upload, Image as ImageIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button, Input, Separator } from './ui';
import { createClient } from '@/lib/supabase/client';

const formSchema = z.object({
  label: z.string().min(1, "Label is required"),
  imageUrl: z.string().min(1, "Image is required"),
});

type BillboardFormValues = z.infer<typeof formSchema>;

interface BillboardFormProps {
  billboardId?: string;
  initialData: { label: string; imageUrl: string } | null;
}

export function BillboardForm({ billboardId, initialData }: BillboardFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const title = initialData ? 'Edit Billboard' : 'Create Billboard';
  const description = initialData ? 'Update your store banner.' : 'Add a new banner to your store.';
  const action = initialData ? 'Save changes' : 'Create';

  const form = useForm<BillboardFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      label: initialData.label,
      imageUrl: initialData.imageUrl,
    } : {
      label: '',
      imageUrl: '',
    }
  });

  // Watch values for live preview
  const labelValue = form.watch('label');
  const imageUrlValue = form.watch('imageUrl');

  const onSubmit = async (data: BillboardFormValues) => {
    try {
      setLoading(true);
      
      if (billboardId) {
        // Update existing billboard
        await supabase
          .from('billboards')
          .update({ 
            label: data.label, 
            image_url: data.imageUrl 
          })
          .eq('id', billboardId);
      } else {
        // Create new billboard
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        
        await supabase
          .from('billboards')
          .insert({ 
            label: data.label, 
            image_url: data.imageUrl,
            user_id: session.user.id
          });
      }
      
      router.push('/billboards');
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    if (!billboardId) return;
    
    if (window.confirm("Are you sure you want to delete this billboard?")) {
      setLoading(true);
      
      try {
        await supabase
          .from('billboards')
          .delete()
          .eq('id', billboardId);
        
        router.push('/billboards');
        router.refresh();
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      // Simulate upload - in production, upload to Supabase Storage
      setTimeout(() => {
        const fakeUrl = URL.createObjectURL(file);
        form.setValue('imageUrl', fakeUrl);
        setLoading(false);
      }, 1000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {billboardId && (
          <Button disabled={loading} variant="destructive" size="icon" onClick={onDelete}>
            <Trash className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Separator />

      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column: Input Fields */}
          <div className="space-y-8">
            <div className="rounded-lg border p-4 bg-card">
              <h3 className="mb-4 text-lg font-medium">Content</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Banner Label</label>
                  <Input 
                    disabled={loading} 
                    placeholder="e.g. Summer Sale 50% Off" 
                    {...form.register('label')} 
                  />
                  <p className="text-xs text-muted-foreground">
                    This text will be overlaid on the image.
                  </p>
                  {form.formState.errors.label && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.label.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Background Image</label>
                  
                  {!imageUrlValue ? (
                    <label className="flex flex-col items-center justify-center w-full h-40 rounded-md border-2 border-dashed cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground font-medium">
                          Click to upload image
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Recommended: 1920x600px
                        </p>
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageUpload} 
                        disabled={loading} 
                      />
                    </label>
                  ) : (
                    <div className="flex items-center gap-4 p-2 border rounded-md">
                      <div className="relative h-16 w-24 rounded overflow-hidden bg-muted">
                        <img 
                          src={imageUrlValue} 
                          className="h-full w-full object-cover" 
                          alt="Thumbnail" 
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Image uploaded</p>
                        <p className="text-xs text-muted-foreground">
                          To change, remove this one first.
                        </p>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive hover:text-destructive" 
                        onClick={() => form.setValue('imageUrl', '')}
                      >
                        <Trash className="h-4 w-4 mr-2" /> Remove
                      </Button>
                    </div>
                  )}
                  {form.formState.errors.imageUrl && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.imageUrl.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Button disabled={loading} className="w-full md:w-auto" type="submit">
              {action}
            </Button>
          </div>

          {/* Right Column: Live Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium leading-none text-muted-foreground">
                Live Preview
              </label>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                Storefront View
              </span>
            </div>
            
            <div className="relative aspect-[2.4/1] w-full overflow-hidden rounded-xl border bg-slate-100 dark:bg-slate-900 shadow-sm flex items-center justify-center group">
              {imageUrlValue ? (
                <>
                  <img 
                    src={imageUrlValue} 
                    alt="Billboard Preview" 
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Dark Overlay for text readability */}
                  <div className="absolute inset-0 bg-black/40" />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground/40">
                  <ImageIcon className="h-16 w-16 mb-2 opacity-20" />
                  <span className="text-sm font-medium">No image selected</span>
                </div>
              )}
              
              {/* Centered Text Overlay */}
              <div className="relative z-10 text-center px-6 max-w-xl">
                <h2 className={`text-3xl md:text-5xl font-bold text-white drop-shadow-lg transition-all ${!labelValue ? 'opacity-50' : ''}`}>
                  {labelValue || "Your Label Here"}
                </h2>
              </div>
            </div>
            
            <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-4">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Tip:</strong> This is the hero section of your store. Use a high-quality background image and a short, catchy label to attract customers.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
