import { notFound } from 'next/navigation';
import { BillboardForm } from '@/components/BillboardForm';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  params: { billboardId: string };
}

export default async function EditBillboardPage({ params }: PageProps) {
  const supabase = await createClient();
  const { data: billboard } = await supabase
    .from('billboards')
    .select('id, label, image_url')
    .eq('id', params.billboardId)
    .maybeSingle();

  if (!billboard) {
    notFound();
  }

  return (
    <BillboardForm
      billboardId={billboard.id}
      initialData={{ label: billboard.label, imageUrl: billboard.image_url }}
    />
  );
}




