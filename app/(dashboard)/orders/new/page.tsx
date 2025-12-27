import { OrderForm } from '@/components/OrderForm';
import { createClient } from '@/lib/supabase/server';

export default async function NewOrderPage() {
  const supabase = await createClient();

  // Fetch all Products and their Variants for selection
  const { data: productsData } = await supabase
    .from('products')
    .select(`
      id,
      name,
      price,
      product_variants (
        id,
        stock,
        sizes (name, value),
        colors (name, value)
      )
    `)
    .eq('is_archived', false);

  const products = (productsData || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
    variants: (p.product_variants || []).map((v: any) => ({
      id: v.id,
      stock: v.stock,
      size: v.sizes,
      color: v.colors
    }))
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <OrderForm 
          initialData={null} 
          products={products}
        />
      </div>
    </div>
  );
}

