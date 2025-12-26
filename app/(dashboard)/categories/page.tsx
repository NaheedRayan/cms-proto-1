import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';

interface Category {
  id: string;
  name: string;
  created_at: string;
}

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: categories, error } = await supabase
    .from('categories')
    .select(`
      id,
      name,
      created_at
    `)
    .order('name', { ascending: true });

  const typedCategories = (categories ?? []) as unknown as Category[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Organize your product catalog with categories.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/categories/new" className="inline-flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            New category
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className='py-2'>Id</th>
                  <th className="py-2">Name</th>
                  <th className="py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {typedCategories.map((category) => (
                  <tr key={category.id} className="border-t">

                    <td className="py-3">
                      <Badge variant="outline">
                        {category.id}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Link
                        href={`/categories/${category.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {category.name}
                      </Link>
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {new Date(category.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {typedCategories.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-muted-foreground">
                      No categories yet. Create one to start organizing products.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
