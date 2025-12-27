import { createClient } from '@/lib/supabase/server';
import { OrdersClient } from '@/components/orders-client';
import { Button } from '@/components/ui';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default async function OrdersPage() {
  const supabase = await createClient();
  
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Orders ({orders?.length || 0})</h1>
          <p className="text-sm text-muted-foreground">
            Manage orders for your store with COD, BKash, and Card payment support.
          </p>
        </div>
        <Link href="/orders/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add New
          </Button>
        </Link>
      </div>

      <OrdersClient orders={orders || []} />
    </div>
  );
}
