'use client';

import { useState, useEffect } from 'react';
import * as z from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash, Plus, Package, User, CreditCard, Truck, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button, Input, Separator, Card, CardContent, Badge } from './ui';
import { createClient } from '@/lib/supabase/client';

const formSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Invalid email").or(z.literal("")),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().min(1, "Address is required"),
  status: z.enum(['pending', 'processing', 'completed', 'cancelled']),
  paymentMethod: z.enum(['cod', 'card', 'mbank']),
  isPaid: z.boolean(),
  items: z.array(z.object({
    id: z.string().optional(),
    productId: z.string().min(1, "Product is required"),
    variantId: z.string().optional(),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    unitPrice: z.number().min(0, "Price must be at least 0"),
  })).min(1, "At least one item is required"),
});

type OrderFormValues = z.infer<typeof formSchema>;

interface Product {
  id: string;
  name: string;
  price: number;
  variants: {
    id: string;
    size: { name: string; value: string } | null;
    color: { name: string; value: string } | null;
    stock: number;
  }[];
}

interface OrderFormProps {
  orderId?: string;
  initialData: {
    customerName: string;
    customerEmail: string;
    phone: string;
    address: string;
    status: 'pending' | 'processing' | 'completed' | 'cancelled';
    paymentMethod: 'cod' | 'card' | 'mbank';
    isPaid: boolean;
    items: {
      id?: string;
      productId: string;
      variantId?: string;
      quantity: number;
      unitPrice: number;
    }[];
  } | null;
  products: Product[];
}

export function OrderForm({ orderId, initialData, products }: OrderFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const title = orderId ? 'Edit Order' : 'Create Order';
  const description = orderId ? 'Update order details and items.' : 'Add a new manual order.';
  const action = orderId ? 'Save changes' : 'Create';

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      customerName: '',
      customerEmail: '',
      phone: '',
      address: '',
      status: 'pending',
      paymentMethod: 'cod',
      isPaid: false,
      items: [{ productId: '', quantity: 1, unitPrice: 0 }],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const onSubmit = async (data: OrderFormValues) => {
    try {
      setLoading(true);
      const totalPrice = data.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);

      // Manage customer record (CRM logic)
      let customerId: string | null = null;
      if (data.customerEmail) {
        // 1. Try to find customer by email
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('email', data.customerEmail)
          .maybeSingle();

        if (existingCustomer) {
          customerId = existingCustomer.id;
          // Update customer info to keep it in sync
          await supabase
            .from('customers')
            .update({
              name: data.customerName,
              phone: data.phone,
            })
            .eq('id', customerId);
        } else {
          // 2. Create new customer record
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({
              name: data.customerName,
              email: data.customerEmail,
              phone: data.phone,
            })
            .select('id')
            .single();

          if (customerError) {
            console.error('Error creating customer:', customerError);
            // Non-blocking for the order creation, but good to know
          } else if (newCustomer) {
            customerId = newCustomer.id;
          }
        }
      }

      if (orderId) {
        // Update order
        const { error: orderError } = await supabase
          .from('orders')
          .update({
            customer_id: customerId, // Link to customer table
            customer_name: data.customerName,
            customer_email: data.customerEmail || null,
            phone: data.phone,
            address: data.address,
            status: data.status,
            payment_method: data.paymentMethod,
            is_paid: data.isPaid,
            total_price: totalPrice,
          })
          .eq('id', orderId);

        if (orderError) throw orderError;

        // Update items: Simple strategy - delete and re-insert
        await supabase.from('order_items').delete().eq('order_id', orderId);
        
        const { error: itemsError } = await supabase.from('order_items').insert(
          data.items.map(item => ({
            order_id: orderId,
            product_id: item.productId,
            variant_id: item.variantId || null,
            quantity: item.quantity,
            unit_price: item.unitPrice,
          }))
        );

        if (itemsError) throw itemsError;
      } else {
        // Create new order
        const { data: newOrder, error: orderError } = await supabase
          .from('orders')
          .insert({
            customer_id: customerId, // Link to customer table
            customer_name: data.customerName,
            customer_email: data.customerEmail || null,
            phone: data.phone,
            address: data.address,
            status: data.status,
            payment_method: data.paymentMethod,
            is_paid: data.isPaid,
            total_price: totalPrice,
          })
          .select()
          .single();

        if (orderError || !newOrder) throw orderError;

        const { error: itemsError } = await supabase.from('order_items').insert(
          data.items.map(item => ({
            order_id: newOrder.id,
            product_id: item.productId,
            variant_id: item.variantId || null,
            quantity: item.quantity,
            unit_price: item.unitPrice,
          }))
        );

        if (itemsError) throw itemsError;
      }

      router.push('/orders');
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Something went wrong. Please check console.');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    if (!orderId) return;
    if (window.confirm("Are you sure you want to delete this order?")) {
      setLoading(true);
      try {
        await supabase.from('orders').delete().eq('id', orderId);
        router.push('/orders');
        router.refresh();
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      form.setValue(`items.${index}.unitPrice`, product.price);
      // Reset variant if product changes
      form.setValue(`items.${index}.variantId`, undefined);
    }
  };

  const watchedItems = form.watch('items');
  const totalPrice = watchedItems.reduce((acc, item) => acc + ((item.quantity || 0) * (item.unitPrice || 0)), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {orderId && (
          <Button disabled={loading} variant="destructive" size="icon" onClick={onDelete}>
            <Trash className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Separator />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Customer Info */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 font-semibold">
                <User className="h-4 w-4" /> Customer Information
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input disabled={loading} {...form.register('customerName')} placeholder="Full Name" />
                {form.formState.errors.customerName && <p className="text-xs text-destructive">{form.formState.errors.customerName.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input disabled={loading} {...form.register('customerEmail')} placeholder="email@example.com" />
                {form.formState.errors.customerEmail && <p className="text-xs text-destructive">{form.formState.errors.customerEmail.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input disabled={loading} {...form.register('phone')} placeholder="+880..." />
                {form.formState.errors.phone && <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Address</label>
                <Input disabled={loading} {...form.register('address')} placeholder="Full shipping address" />
                {form.formState.errors.address && <p className="text-xs text-destructive">{form.formState.errors.address.message}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Order Status */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 font-semibold">
                <Truck className="h-4 w-4" /> Order Status & Payment
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Order Status</label>
                <select 
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  {...form.register('status')}
                  disabled={loading}
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Method</label>
                <select 
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  {...form.register('paymentMethod')}
                  disabled={loading}
                >
                  <option value="cod">Cash on Delivery</option>
                  <option value="card">Card</option>
                  <option value="mbank">Mobile Banking (BKash/Nagad)</option>
                </select>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <input 
                  type="checkbox" 
                  id="isPaid"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  {...form.register('isPaid')}
                  disabled={loading}
                />
                <label htmlFor="isPaid" className="text-sm font-medium cursor-pointer">Mark as Paid</label>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total Amount:</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Items */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between font-semibold">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" /> Order Items
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: '', quantity: 1, unitPrice: 0 })}>
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </div>
            
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg bg-muted/10 relative group">
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Product</label>
                    <select 
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      {...form.register(`items.${index}.productId` as const)}
                      onChange={(e) => handleProductChange(index, e.target.value)}
                      disabled={loading}
                    >
                      <option value="">Select a product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} - ${p.price}</option>
                      ))}
                    </select>
                  </div>

                  {watchedItems[index]?.productId && (
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Variant (Size/Color)</label>
                      <select 
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        {...form.register(`items.${index}.variantId` as const)}
                        disabled={loading}
                      >
                        <option value="">Default (No Variant)</option>
                        {products.find(p => p.id === watchedItems[index].productId)?.variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.size?.name || 'N/A'} / {v.color?.name || 'N/A'} (Stock: {v.stock})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="w-24 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Qty</label>
                    <Input 
                      type="number" 
                      min="1" 
                      {...form.register(`items.${index}.quantity` as const, { valueAsNumber: true })} 
                      disabled={loading}
                    />
                  </div>

                  <div className="w-32 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Unit Price</label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      {...form.register(`items.${index}.unitPrice` as const, { valueAsNumber: true })} 
                      disabled={loading}
                    />
                  </div>

                  <div className="flex items-end pb-1">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => remove(index)}
                      disabled={loading || fields.length === 1}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {form.formState.errors.items && <p className="text-sm text-destructive font-medium">{form.formState.errors.items.message}</p>}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.push('/orders')}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button disabled={loading} type="submit">
            {action}
          </Button>
        </div>
      </form>
    </div>
  );
}

