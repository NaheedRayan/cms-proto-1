import { notFound } from 'next/navigation';
import { CategoryForm } from '@/components/CategoryForm';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  params: { categoryId: string };
}

export default async function EditCategoryPage({ params }: PageProps) {
  const supabase = await createClient();
  
  const [categoryRes, billboardsRes] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, billboard_id')
      .eq('id', params.categoryId)
      .maybeSingle(),
    supabase
      .from('billboards')
      .select('id, label')
      .order('label'),
  ]);

  if (!categoryRes.data) {
    notFound();
  }

  return (
    <CategoryForm
      categoryId={categoryRes.data.id}
      initialData={{
        name: categoryRes.data.name,
        billboardId: categoryRes.data.billboard_id ?? '',
      }}
      billboards={billboardsRes.data ?? []}
    />
  );
}




