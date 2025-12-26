import { CategoryForm } from '@/components/CategoryForm';
import { createClient } from '@/lib/supabase/client';

export default async function NewCategoryPage() {
  return <CategoryForm initialData={null} />;
}




