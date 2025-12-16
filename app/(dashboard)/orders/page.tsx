import { createClient } from '@/lib/supabase/client';
import { OrdersClient } from '@/components/orders-client';

export default async function OrdersPage() {
  const supabase = createClient();
  
  const { data: ordersData } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  const orders = ordersData?.map((order) => ({
    ...order,
    customer: Array.isArray(order.customer) ? order.customer[0] : order.customer,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Orders ({orders?.length || 0})</h1>
        <p className="text-sm text-muted-foreground">
          Manage orders for your store with COD, BKash, and Card payment support.
        </p>
      </div>

      <OrdersClient orders={orders || []} />
    </div>
  );
}
