import { createClient } from '@/lib/supabase/server';
import { InventoryClient, Product } from '@/components/inventory-client';

export default async function InventoryPage() {
  const supabase = await createClient();
  
  // Fetch products with variants
  const { data: products } = await supabase
    .from('products')
    .select(`
      id,
      name,
      stock_cached,
      product_images(url, is_primary),
      product_variants(
        id,
        stock,
        size:sizes(id, name, value),
        color:colors(id, name, value)
      )
    `)
    .order('name');

  // Fetch sizes and colors for reference
  const [{ data: sizes }, { data: colors }] = await Promise.all([
    supabase.from('sizes').select('id, name, value').order('name'),
    supabase.from('colors').select('id, name, value').order('name'),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Inventory</h1>
        <p className="text-sm text-muted-foreground">
          Manage stock levels for all products and variants.
        </p>
      </div>

      <InventoryClient 
        products={(products ?? []) as unknown as Product[]} 
        sizes={sizes || []} 
        colors={colors || []} 
      />
    </div>
  );
}
