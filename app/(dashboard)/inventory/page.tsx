import { createClient } from '@/lib/supabase/server';
import { InventoryClient, Product } from '@/components/inventory-client';

export default async function InventoryPage() {
  const supabase = await createClient();
  
  // Fetch products with variants
  const { data: productsData, error } = await supabase
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

  if (error) {
    console.error('[INVENTORY_PAGE_ERROR]:', error);
  }

  const products = (productsData ?? []).map((product: any) => ({
    ...product,
    product_images: Array.isArray(product.product_images) ? product.product_images : [],
    product_variants: Array.isArray(product.product_variants) ? product.product_variants : [],
  }));

  return (
    <div className="space-y-6 pt-4">
      <div>
        <h1 className="text-3xl font-semibold">Inventory</h1>
        <p className="text-sm text-muted-foreground">
          Manage stock levels for all products and variants.
        </p>
      </div>

      <InventoryClient 
        products={products as unknown as Product[]} 
      />
    </div>
  );
}
