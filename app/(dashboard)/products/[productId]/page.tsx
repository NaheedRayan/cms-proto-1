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
    supabase.from('colors').select('*').order('name'),
    supabase.from('sizes').select('*').order('name'),
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

  const sizeIds = Array.from(new Set(variants.map((v) => v.size_id).filter(Boolean))) as string[];
  const colorIds = Array.from(new Set(variants.map((v) => v.color_id).filter(Boolean))) as string[];
  
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
        sizeIds,
        colorIds,
        tags: [],
        metadata,
        variants: variants.map((v) => ({
          sizeId: v.size_id || '',
          colorId: v.color_id || '',
          stock: v.stock,
        })),
        isFeatured: product.is_featured,
        isArchived: product.is_archived,
      }}
      categories={categoriesRes.data ?? []}
      colors={colorsRes.data ?? []}
      sizes={sizesRes.data ?? []}
    />
  );
}




