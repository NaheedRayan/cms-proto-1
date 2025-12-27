import { notFound } from 'next/navigation';
import { OrderForm } from '@/components/OrderForm';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  params: { orderId: string };
}

export default async function EditOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const supabase = await createClient();
  const { orderId } = await params;

  // 1. Fetch Order
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) {
    notFound();
  }

  // 2. Fetch Order Items
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);

  // 3. Fetch all Products and their Variants for selection
  const { data: productsData } = await supabase
    .from('products')
    .select(`
      id,
      name,
      price,
      product_variants (
        id,
        stock,
        sizes (name, value),
        colors (name, value)
      )
    `)
    .eq('is_archived', false);

  const products = (productsData || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
    variants: (p.product_variants || []).map((v: any) => ({
      id: v.id,
      stock: v.stock,
      size: v.sizes,
      color: v.colors
    }))
  }));

  const initialData = {
    customerName: order.customer_name || '',
    customerEmail: order.customer_email || '',
    phone: order.phone || '',
    address: order.address || '',
    status: order.status as 'pending' | 'processing' | 'completed' | 'cancelled',
    paymentMethod: order.payment_method as 'cod' | 'card' | 'mbank',
    isPaid: order.is_paid,
    items: (orderItems || []).map(item => ({
      id: item.id,
      productId: item.product_id,
      variantId: item.variant_id || undefined,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price)
    }))
  };

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <OrderForm 
          orderId={orderId} 
          initialData={initialData} 
          products={products}
        />
      </div>
    </div>
  );
}

