'use client';

import { useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { Badge, Input, Card, CardContent, Separator } from './ui';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';
type PaymentMethod = 'cod' | 'card' | 'bkash';

interface Order {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  phone: string | null;
  address: string | null;
  total_price: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  is_paid: boolean;
  created_at: string;
}

interface OrdersClientProps {
  orders: Order[];
}

export function OrdersClient({ orders: initialOrders }: OrdersClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [searchTerm, setSearchTerm] = useState('');

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    // Optimistic update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    
    await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);
    
    router.refresh();
  };

  const handlePaymentStatusChange = async (orderId: string, isPaid: boolean) => {
    // Optimistic update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, is_paid: isPaid } : o));
    
    await supabase
      .from('orders')
      .update({ is_paid: isPaid })
      .eq('id', orderId);
    
    router.refresh();
  };

  const getStatusColor = (status: OrderStatus) => {
    switch(status) {
      case 'completed': return 'text-green-600 bg-green-500/10 border-green-500/20';
      case 'processing': return 'text-blue-600 bg-blue-500/10 border-blue-500/20';
      case 'cancelled': return 'text-red-600 bg-red-500/10 border-red-500/20';
      default: return 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20';
    }
  };

  const getPaymentColor = (order: Order) => {
    if (order.is_paid) {
      return "text-green-600 bg-green-500/10 border-green-500/20";
    }
    // COD orders are orange (pending collection), not error
    if (order.payment_method === 'cod') {
      return "text-orange-600 bg-orange-500/10 border-orange-500/20";
    }
    return "text-destructive bg-destructive/10 border-destructive/20";
  };

  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.customer_name && order.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (order.phone && order.phone.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center py-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by ID, customer name or phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8" 
            />
          </div>
        </div>

        <div className="rounded-md border">
          <table className="w-full caption-bottom text-sm text-left">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50">
                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Order ID</th>
                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Method</th>
                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Payment</th>
                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Customer</th>
                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Total</th>
                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-muted-foreground">
                    No orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 font-mono text-xs">{order.id.slice(0, 8)}</td>
                    <td className="p-4">
                      <Badge variant="secondary" className="font-normal text-xs uppercase">
                        {order.payment_method}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className={`relative inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${getPaymentColor(order)}`}>
                        <select 
                          value={order.is_paid ? 'true' : 'false'}
                          onChange={(e) => handlePaymentStatusChange(order.id, e.target.value === 'true')}
                          className="bg-transparent border-none outline-none cursor-pointer appearance-none pr-5 py-0.5"
                        >
                          <option value="true">Paid</option>
                          <option value="false">Unpaid</option>
                        </select>
                        <ChevronDown className="absolute right-1.5 h-3 w-3 opacity-50 pointer-events-none" />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className={`relative inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${getStatusColor(order.status)}`}>
                        <select 
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                          className="bg-transparent border-none outline-none cursor-pointer appearance-none pr-5 py-0.5 capitalize"
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <ChevronDown className="absolute right-1.5 h-3 w-3 opacity-50 pointer-events-none" />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{order.phone || 'N/A'}</div>
                      <div className="text-xs text-muted-foreground">{order.customer_name || 'Unknown'}</div>
                    </td>
                    <td className="p-4 font-semibold">${Number(order.total_price).toFixed(2)}</td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
