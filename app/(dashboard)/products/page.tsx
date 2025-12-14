import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server-client';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { ProductsTable } from '@/components/ProductsTable';

export default async function ProductsPage() {
  const supabase = getSupabaseServerClient();
  const { data: products } = await supabase
    .from('products')
    .select(
      `
      id,
      name,
      price,
      stock_cached,
      is_featured,
      is_archived,
      updated_at,
      category:categories(name)
    `,
    )
    .order('updated_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage everything from featured listings to archived inventory with client-side search and filters.
          </p>
        </div>
        <Button asChild>
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




