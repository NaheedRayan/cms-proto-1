import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProductForm } from '@/components/ProductForm';

interface PageProps {
  params: { productId: string };
}

export default async function EditProductPage({ params }: PageProps) {
  const supabase = await createClient();

  const [productRes, categoriesRes, colorsRes, sizesRes] = await Promise.all([
    supabase
      .from('products')
      .select(
        `
        id,
        name,
        description,
        price,
        stock_cached,
        category_id,
        is_featured,
        is_archived,
        metadata,
        product_images(url),
        product_variants(id, size_id, color_id, stock)
      `,
      )
      .eq('id', params.productId)
      .maybeSingle(),
    supabase.from('categories').select('*').order('name'),
    supabase.from('colors').select('*').eq('product_id', params.productId).order('created_at'),
    supabase.from('sizes').select('*').eq('product_id', params.productId).order('created_at'),
  ]);

  if (!productRes.data) {
    notFound();
  }

  const product = productRes.data;
  const images = (product.product_images as Array<{ url: string }>)?.map((img) => img.url) ?? [];
  const variants = (product.product_variants as Array<{
    id: string;
    size_id: string | null;
    color_id: string | null;
    stock: number;
  }>) ?? [];

  const sizes = (sizesRes.data ?? []) as Array<{ id: string; name: string; value: string }>;
  const colors = (colorsRes.data ?? []) as Array<{ id: string; name: string; value: string }>;
  
  const metadata = Object.entries((product.metadata as Record<string, string>) || {}).map(
    ([key, value]) => ({ key, value })
  );

  return (
    <ProductForm
      initialData={{
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: Number(product.price),
        stock: product.stock_cached || 0,
        categoryId: product.category_id || '',
        images,
        sizes,
        colors,
        tags: [],
        metadata,
        variants: variants.map((v) => ({
          sizeIndex: sizes.findIndex(s => s.id === v.size_id),
          colorIndex: colors.findIndex(c => c.id === v.color_id),
          stock: v.stock,
        })).filter(v => v.sizeIndex !== -1 && v.colorIndex !== -1),
        isFeatured: product.is_featured,
        isArchived: product.is_archived,
      }}
      categories={categoriesRes.data ?? []}
    />
  );
}




