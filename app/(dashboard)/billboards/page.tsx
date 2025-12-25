import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
// import { createClient } from '@/lib/supabase/client';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui';

interface Billboard {
  id: string;
  label: string;
  image_url: string;
  created_at: string;
}

export default async function BillboardsPage() {
  const supabase = await createClient();
  const { data: billboards } = await supabase
    .from('billboards')
    .select('id, label, image_url, created_at')
    .order('created_at', { ascending: false });

  const typedBillboards = (billboards ?? []) as Billboard[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Billboards</h1>
          <p className="text-sm text-muted-foreground">Hero banners that power your storefront.</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/billboards/new" className="flex items-center">
            <PlusCircle className="h-4 w-4" />
            New billboard
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Live billboards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {typedBillboards.map((billboard) => (
              <Link
                key={billboard.id}
                href={`/billboards/${billboard.id}`}
                className="group overflow-hidden rounded-xl border transition hover:border-primary"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={billboard.image_url}
                  alt={billboard.label}
                  className="h-48 w-full object-cover transition group-hover:scale-105"
                />
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-semibold">{billboard.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(billboard.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline">Edit</Badge>
                </div>
              </Link>
            ))}
            {typedBillboards.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                No billboards yet. Create the first one to highlight new drops.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
