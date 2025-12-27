'use client';

import { useState } from 'react';
import { Package, Search, Save } from 'lucide-react';
import { Button, Input, Badge, Card, CardContent } from './ui';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  image?: string;
  variantLabel: string;
  stock: number;
  originalStock: number;
  variantId?: string;
  isVariant: boolean;
}

export interface Product {
  id: string;
  name: string;
  stock_cached: number;
  product_images: { url: string; is_primary: boolean }[];
  product_variants: {
    id: string;
    stock: number;
    size: { id: string; name: string; value: string } | null;
    color: { id: string; name: string; value: string } | null;
  }[];
}

interface InventoryClientProps {
  products: Product[];
}

export function InventoryClient({ products }: InventoryClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Flatten products into inventory items
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(() => {
    const items: InventoryItem[] = [];

    products.forEach(p => {
      const primaryImage = p.product_images.find(img => img.is_primary)?.url || p.product_images[0]?.url;

      if (p.product_variants && p.product_variants.length > 0) {
        // Create an item for each variant
        p.product_variants.forEach((v) => {
          items.push({
            id: v.id,
            productId: p.id,
            productName: p.name,
            image: primaryImage,
            variantLabel: `${v.size?.name || 'Unknown'} / ${v.color?.name || 'Unknown'}`,
            stock: v.stock,
            originalStock: v.stock,
            variantId: v.id,
            isVariant: true
          });
        });
      } else {
        // Simple product (no variants)
        items.push({
          id: p.id,
          productId: p.id,
          productName: p.name,
          image: primaryImage,
          variantLabel: 'Standard',
          stock: p.stock_cached,
          originalStock: p.stock_cached,
          isVariant: false
        });
      }
    });

    return items;
  });

  const handleStockChange = (itemId: string, newStock: string) => {
    const val = parseInt(newStock) || 0;
    setInventoryItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, stock: val };
      }
      return item;
    }));
    setHasChanges(true);
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      const changedItems = inventoryItems.filter(item => item.stock !== item.originalStock);

      // Update variants
      const variantUpdates = changedItems
        .filter(item => item.isVariant && item.variantId)
        .map(item => 
          supabase
            .from('product_variants')
            .update({ stock: item.stock })
            .eq('id', item.variantId!)
        );

      // Update simple products (no variants)
      const productUpdates = changedItems
        .filter(item => !item.isVariant)
        .map(item => 
          supabase
            .from('products')
            .update({ stock_cached: item.stock })
            .eq('id', item.productId)
        );

      await Promise.all([...variantUpdates, ...productUpdates]);

      setHasChanges(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to save changes:', error);
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = inventoryItems.filter(item => 
    item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.variantLabel.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardContent className="p-6 pt-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by product or variant..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button onClick={saveChanges} disabled={!hasChanges} loading={saving}>
            Save Changes
            <Save className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="rounded-md border bg-card">
          <table className="w-full caption-bottom text-sm text-left">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50">
                <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-[80px]">Image</th>
                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Product</th>
                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Variant</th>
                <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-[150px]">Stock Level</th>
                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No items found.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4">
                      <div className="h-10 w-10 rounded-md overflow-hidden border bg-muted flex items-center justify-center">
                        {item.image ? (
                          <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-medium">{item.productName}</td>
                    <td className="p-4">
                      <Badge variant="outline" className={!item.isVariant ? "bg-muted text-muted-foreground border-transparent" : ""}>
                        {item.variantLabel}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Input 
                        type="number" 
                        min="0"
                        value={item.stock}
                        onChange={(e) => handleStockChange(item.id, e.target.value)}
                        className={item.stock !== item.originalStock ? "border-primary ring-1 ring-primary" : ""}
                      />
                    </td>
                    <td className="p-4">
                      {item.stock === 0 ? (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                          Out of Stock
                        </Badge>
                      ) : item.stock < 10 ? (
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400">
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400">
                          In Stock
                        </Badge>
                      )}
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
