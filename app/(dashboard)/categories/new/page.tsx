import { CategoryForm } from '@/components/CategoryForm';
import { createClient } from '@/lib/supabase/client';

export default async function NewCategoryPage() {
  const supabase = createClient();
  const { data: billboards } = await supabase
    .from('billboards')
    .select('id, label')
    .order('label');

  return <CategoryForm initialData={null} billboards={billboards ?? []} />;
}




