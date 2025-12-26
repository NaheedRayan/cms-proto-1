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
  created_at: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof formSchema>;

interface CategoryFormProps {
  categoryId?: string;
  initialData: { name: string, created_at: string } | null;
}

export function CategoryForm({ categoryId, initialData }: CategoryFormProps) {
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
      created_at: initialData.created_at,
    } : {
      name: '',
      created_at: new Date().toISOString(),
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

        <Button disabled={loading} type="submit">
          {action}
        </Button>
      </form>
    </div>
  );
}
