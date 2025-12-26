'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Edit, Trash, Check, Image as ImageIcon, Search } from 'lucide-react';
import { Button, Input, Badge } from './ui';

interface Product {
  id: string;
  name: string;
  price: number;
  stock_cached: number;
  is_featured: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  category: { name: string } | null;
  image: string | null;
}

interface ProductsTableProps {
  products: Product[];
}

export function ProductsTable({ products }: ProductsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.category?.name && p.category.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center py-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filter by name or category..." 
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
              <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-[100px]">Image</th>
              <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Name</th>
              <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Category</th>
              <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Price</th>
              <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Stock</th>
              <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Featured</th>
              <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Created At</th>
              <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Updated At</th>
              <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-4 text-center text-muted-foreground">
                  No products found.
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr 
                  key={product.id} 
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  <td className="p-4 align-middle">
                    <div className="h-12 w-12 rounded-md overflow-hidden bg-muted border flex items-center justify-center">
                      {product.image ? (
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </td>
                  <td className="p-4 font-medium">{product.name}</td>
                  <td className="p-4">{product.category?.name || 'Uncategorized'}</td>
                  <td className="p-4">${product.price.toFixed(2)}</td>
                  <td className="p-4">
                    {product.stock_cached > 0 ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                        {product.stock_cached} in stock
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                        Out of Stock
                      </Badge>
                    )}
                  </td>
                  <td className="p-4">
                    {product.is_featured ? <Check className="h-4 w-4 text-green-500" /> : '-'}
                  </td>
                  <td className="p-4">{new Date(product.created_at).toLocaleDateString()}</td>
                  <td className="p-4">{new Date(product.updated_at).toLocaleDateString()}</td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/products/${product.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
