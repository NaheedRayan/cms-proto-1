import { notFound } from 'next/navigation';
import { CategoryForm } from '@/components/CategoryForm';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  params: { categoryId: string };
}

export default async function EditCategoryPage({ params }: PageProps) {
  const supabase = await createClient();
  
  const { data: category } = await supabase
    .from('categories')
    .select('id, name, created_at')
    .eq('id', params.categoryId)
    .maybeSingle();

  if (!category) {
    notFound();
  }

  return (
    <CategoryForm
      categoryId={category.id}
      initialData={{
        name: category.name,
        created_at: category.created_at,
      }}
    />
  );
}




