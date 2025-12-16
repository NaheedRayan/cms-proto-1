// 'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { RevenueChart, type RevenuePoint } from '@/components/revenue-chart';
import { createClient } from '@/lib/supabase/server';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

export default async function DashboardPage() {
  const supabase = await createClient();

  const [productsCountRes, ordersCountRes, revenueRes, recentOrdersRes] = await Promise.all([
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('is_archived', false),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true }),
    supabase.rpc('get_monthly_revenue'),
    supabase
      .from('orders')
      .select('id, total_price, customer_name, status, created_at, payment_method, is_paid')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const chartPoints: RevenuePoint[] =
    (revenueRes.data as any[])?.map((point) => ({
      ...point,
      revenue: Number(point.revenue ?? 0),
      month_date: point.month_date ?? '',
      month_label: point.month_label ?? '',
    })) ?? [];

  const totalRevenue = chartPoints.reduce((acc, point) => acc + point.revenue, 0);
  const totalOrders = ordersCountRes.count ?? 0;
  const activeProducts = productsCountRes.count ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Key business metrics in real time.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total revenue (12 mo)</CardTitle>
            <p className="text-sm text-muted-foreground">Only paid/completed orders are counted.</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
            <p className="text-sm text-muted-foreground">All time orders.</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active products</CardTitle>
            <p className="text-sm text-muted-foreground">Archived products are hidden.</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{activeProducts}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue (last 12 months)</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart data={chartPoints} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2">Customer</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Payment</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {(recentOrdersRes.data ?? []).map((order) => (
                  <tr key={order.id} className="border-t">
                    <td className="py-2 font-medium">{order.customer_name ?? 'Unknown'}</td>
                    <td className="py-2 capitalize">{order.status}</td>
                    <td className="py-2">{order.payment_method?.toUpperCase()}</td>
                    <td className="py-2 text-right font-semibold">
                      {formatCurrency(Number(order.total_price))}
                    </td>
                  </tr>
                ))}
                {(recentOrdersRes.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                      No orders yet.
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
