'use client';

import { useState } from 'react';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button, Input, Separator } from './ui';
import { createClient } from '@/lib/supabase/client';

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  billboardId: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof formSchema>;

interface Billboard {
  id: string;
  label: string;
}

interface CategoryFormProps {
  categoryId?: string;
  initialData: { name: string; billboardId: string } | null;
  billboards: Billboard[];
}

export function CategoryForm({ categoryId, initialData, billboards }: CategoryFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const title = initialData ? 'Edit Category' : 'Create Category';
  const description = initialData ? 'Update category details.' : 'Add a new category to organize products.';
  const action = initialData ? 'Save changes' : 'Create';

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      billboardId: initialData.billboardId || '',
    } : {
      name: '',
      billboardId: '',
    }
  });

  const onSubmit = async (data: CategoryFormValues) => {
    try {
      setLoading(true);
      
      if (categoryId) {
        // Update existing category
        await supabase
          .from('categories')
          .update({ 
            name: data.name, 
            billboard_id: data.billboardId || null
          })
          .eq('id', categoryId);
      } else {
        // Create new category
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        
        await supabase
          .from('categories')
          .insert({ 
            name: data.name, 
            billboard_id: data.billboardId || null,
            user_id: session.user.id
          });
      }
      
      router.push('/categories');
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    if (!categoryId) return;
    
    if (window.confirm("Are you sure you want to delete this category?")) {
      setLoading(true);
      
      try {
        await supabase
          .from('categories')
          .delete()
          .eq('id', categoryId);
        
        router.push('/categories');
        router.refresh();
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {categoryId && (
          <Button disabled={loading} variant="destructive" size="icon" onClick={onDelete}>
            <Trash className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Separator />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Name</label>
          <Input 
            disabled={loading} 
            placeholder="Category name (e.g. Clothing, Electronics)" 
            {...form.register('name')} 
          />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Billboard (Optional)</label>
          <select 
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            {...form.register('billboardId')}
            disabled={loading}
          >
            <option value="">No billboard</option>
            {billboards.map((billboard) => (
              <option key={billboard.id} value={billboard.id}>
                {billboard.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Select a billboard to display as the category header on your storefront.
          </p>
        </div>

        <Button disabled={loading} type="submit">
          {action}
        </Button>
      </form>
    </div>
  );
}
