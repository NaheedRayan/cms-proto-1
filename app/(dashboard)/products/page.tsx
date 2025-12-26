import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { ProductsTable } from '@/components/ProductsTable';

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data: productsData } = await supabase
    .from('products')
    .select(
      `
      id,
      name,
      price,
      stock_cached,
      is_featured,
      is_archived,
      created_at,
      updated_at,
      metadata,
      category:categories(name, id),
      product_images(url, id)
    `,
    )
    .order('updated_at', { ascending: false });

  const products = productsData?.map((product: any) => ({
    ...product,
    category: Array.isArray(product.category) ? product.category[0] : product.category,
    image: Array.isArray(product.product_images) && product.product_images.length > 0 ? product.product_images[0].url : null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage everything from featured listings to archived inventory with client-side search and filters.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/products/new" className="inline-flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            New product
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Catalog</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductsTable products={products ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}





