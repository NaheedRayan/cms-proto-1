'use client';

import { useState, useEffect } from 'react';
import * as z from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash, Plus, Image as ImageIcon, X, Box } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button, Input, Separator, Switch, Textarea, Badge } from './ui';
import { createClient } from '@/lib/supabase/client';

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  images: z.array(z.string()).min(1, "At least one image is required"),
  price: z.coerce.number().min(0.01, "Price must be at least 0.01"),
  stock: z.coerce.number().min(0).default(0),
  categoryId: z.string().min(1, "Category is required"),
  colorIds: z.array(z.string()).min(1, "At least one color is required"),
  sizeIds: z.array(z.string()).min(1, "At least one size is required"),
  tags: z.array(z.string()).default([]),
  metadata: z.array(z.object({ key: z.string().min(1), value: z.string().min(1) })).default([]),
  variants: z.array(z.object({
    sizeId: z.string(),
    colorId: z.string(),
    stock: z.coerce.number().min(0)
  })).default([]),
  isFeatured: z.boolean().default(false),
  isArchived: z.boolean().default(false),
});

type ProductFormValues = z.infer<typeof formSchema>;

interface Category {
  id: string;
  name: string;
}

interface Size {
  id: string;
  name: string;
  value: string;
}

interface Color {
  id: string;
  name: string;
  value: string;
}

interface ProductFormData {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: string;
  images: string[];
  sizeIds: string[];
  colorIds: string[];
  tags: string[];
  metadata: { key: string; value: string }[];
  variants: { sizeId: string; colorId: string; stock: number }[];
  isFeatured: boolean;
  isArchived: boolean;
}

interface ProductFormProps {
  initialData: ProductFormData | null;
  categories: Category[];
  colors: Color[];
  sizes: Size[];
}

export function ProductForm({ initialData, categories, sizes, colors }: ProductFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const title = initialData ? 'Edit product' : 'Create product';
  const description = initialData ? 'Edit a product' : 'Add a new product';
  const action = initialData ? 'Save changes' : 'Create';

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      ...initialData,
      description: initialData.description || '',
      price: parseFloat(String(initialData.price)),
      stock: initialData.stock || 0,
      images: initialData.images || [],
      sizeIds: initialData.sizeIds || [],
      colorIds: initialData.colorIds || [],
      tags: initialData.tags || [],
      metadata: initialData.metadata || [],
      variants: initialData.variants || [],
    } : {
      name: '',
      description: '',
      images: [],
      price: 0,
      stock: 0,
      categoryId: '',
      colorIds: [],
      sizeIds: [],
      tags: [],
      metadata: [],
      variants: [],
      isFeatured: false,
      isArchived: false,
    }
  });

  const { fields: metadataFields, append: appendMetadata, remove: removeMetadata } = useFieldArray({
    control: form.control,
    name: "metadata"
  });

  // Watch for changes in sizes/colors to auto-generate variants
  const selectedSizeIds = form.watch('sizeIds');
  const selectedColorIds = form.watch('colorIds');
  const currentVariants = form.watch('variants') || [];

  useEffect(() => {
    if (!selectedSizeIds || !selectedColorIds) return;

    const newVariants: Array<{ sizeId: string; colorId: string; stock: number }> = [];
    
    selectedSizeIds.forEach((sizeId: string) => {
      selectedColorIds.forEach((colorId: string) => {
        const existing = currentVariants.find((v) => v.sizeId === sizeId && v.colorId === colorId);
        if (existing) {
          newVariants.push(existing);
        } else {
          newVariants.push({ sizeId, colorId, stock: 0 });
        }
      });
    });

    const isDifferent = newVariants.length !== currentVariants.length || 
                        !newVariants.every((nv) => currentVariants.some((cv) => cv.sizeId === nv.sizeId && cv.colorId === nv.colorId));

    if (isDifferent) {
      form.setValue('variants', newVariants);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(selectedSizeIds), JSON.stringify(selectedColorIds)]);

  const onSubmit = async (data: ProductFormValues) => {
    try {
      setLoading(true);
      
      const totalStock = data.variants && data.variants.length > 0
        ? data.variants.reduce((acc, v) => acc + (v.stock || 0), 0)
        : data.stock;

      const metadataObj = data.metadata.reduce((acc, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {} as Record<string, string>);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      if (initialData) {
        // Update product
        await supabase
          .from('products')
          .update({
            name: data.name,
            description: data.description,
            price: data.price,
            stock_cached: totalStock,
            category_id: data.categoryId,
            is_featured: data.isFeatured,
            is_archived: data.isArchived,
            metadata: metadataObj,
          })
          .eq('id', initialData.id);

        // Update images (delete old, insert new)
        await supabase
          .from('product_images')
          .delete()
          .eq('product_id', initialData.id);

        if (data.images.length > 0) {
          await supabase
            .from('product_images')
            .insert(
              data.images.map((url, idx) => ({
                product_id: initialData.id,
                url,
                position: idx,
                is_primary: idx === 0,
              }))
            );
        }

        // Update variants
        await supabase
          .from('product_variants')
          .delete()
          .eq('product_id', initialData.id);

        if (data.variants.length > 0) {
          await supabase
            .from('product_variants')
            .insert(
              data.variants.map((v) => ({
                product_id: initialData.id,
                size_id: v.sizeId,
                color_id: v.colorId,
                stock: v.stock,
              }))
            );
        }
      } else {
        // Create new product
        const { data: newProduct, error: productError } = await supabase
          .from('products')
          .insert({
            name: data.name,
            description: data.description,
            price: data.price,
            stock_cached: totalStock,
            category_id: data.categoryId,
            is_featured: data.isFeatured,
            is_archived: data.isArchived,
            metadata: metadataObj,
          })
          .select()
          .single();

        if (productError || !newProduct) throw productError;

        // Insert images
        if (data.images.length > 0) {
          await supabase
            .from('product_images')
            .insert(
              data.images.map((url, idx) => ({
                product_id: newProduct.id,
                url,
                position: idx,
                is_primary: idx === 0,
              }))
            );
        }

        // Insert variants
        if (data.variants.length > 0) {
          await supabase
            .from('product_variants')
            .insert(
              data.variants.map((v) => ({
                product_id: newProduct.id,
                size_id: v.sizeId,
                color_id: v.colorId,
                stock: v.stock,
              }))
            );
        }
      }
      
      router.push('/products');
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    if (!initialData) return;
    
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        setLoading(true);
        await supabase
          .from('products')
          .delete()
          .eq('id', initialData.id);
        
        router.push('/products');
        router.refresh();
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      try {
        const sanitizedFileName = file.name.replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, "-").toLowerCase();
        const fileName = `${Date.now()}-${sanitizedFileName}`;
        
        const { data, error } = await supabase.storage
          .from('products')
          .upload(fileName, file);

        if (error) {
          throw error;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(data.path);

        const currentImages = form.getValues('images') || [];
        form.setValue('images', [...currentImages, publicUrl]);
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Failed to upload image.');
      } finally {
        setLoading(false);
      }
    }
  };

  const removeImage = (urlToRemove: string) => {
    const currentImages = form.getValues('images') || [];
    form.setValue('images', currentImages.filter((url: string) => url !== urlToRemove));
  };

  const toggleSelection = (field: 'sizeIds' | 'colorIds', id: string) => {
    const current = form.getValues(field) || [];
    if (current.includes(id)) {
      form.setValue(field, current.filter((item: string) => item !== id));
    } else {
      form.setValue(field, [...current, id]);
    }
    form.trigger(field);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim() !== "") {
      e.preventDefault();
      const currentTags = form.getValues('tags') || [];
      if (!currentTags.includes(tagInput.trim())) {
        form.setValue('tags', [...currentTags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    const currentTags = form.getValues('tags') || [];
    form.setValue('tags', currentTags.filter((t: string) => t !== tag));
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {initialData && (
          <Button disabled={loading} variant="destructive" size="icon" onClick={onDelete}>
            <Trash className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Separator className="my-4" />
      
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
        {/* Images Gallery */}
        <div className="space-y-4">
          <label className="text-sm font-medium leading-none">Product Images</label>
          {form.formState.errors.images && (
            <p className="text-sm font-medium text-destructive">{form.formState.errors.images.message as string}</p>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(form.watch('images') || []).map((imageUrl: string, index: number) => (
              <div key={imageUrl} className="group relative aspect-square rounded-xl overflow-hidden border bg-background">
                <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button type="button" onClick={() => removeImage(imageUrl)} variant="destructive" size="icon" className="h-8 w-8">
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
                {index === 0 && (
                  <div className="absolute left-2 top-2 z-10">
                    <Badge variant="secondary" className="bg-black/50 text-white hover:bg-black/70 border-none">Main</Badge>
                  </div>
                )}
                <img className="object-cover w-full h-full" src={imageUrl} alt="Product" />
              </div>
            ))}
            
            <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <ImageIcon className="w-8 h-8 mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-medium">Add Image</p>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={loading} />
            </label>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Name</label>
            <Input disabled={loading} placeholder="Product Name" {...form.register('name')} />
            {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message as string}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Price ($)</label>
            <Input type="number" step="0.01" disabled={loading} placeholder="9.99" {...form.register('price')} />
            {form.formState.errors.price && <p className="text-xs text-destructive">{form.formState.errors.price.message as string}</p>}
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Description</label>
          <Textarea disabled={loading} placeholder="Product description..." {...form.register('description')} />
          {form.formState.errors.description && <p className="text-xs text-destructive">{form.formState.errors.description.message as string}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Category</label>
          <select 
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            {...form.register('categoryId')}
            disabled={loading}
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {form.formState.errors.categoryId && <p className="text-xs text-destructive">{form.formState.errors.categoryId.message as string}</p>}
        </div>
        
        <div className="grid gap-8 md:grid-cols-2">
          {/* Sizes */}
          <div className="space-y-3">
            <label className="text-sm font-medium leading-none">Sizes</label>
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => {
                const isSelected = form.watch('sizeIds')?.includes(size.id);
                return (
                  <div 
                    key={size.id} 
                    onClick={() => toggleSelection('sizeIds', size.id)}
                    className={`cursor-pointer rounded-md border px-3 py-2 text-sm font-semibold transition-all ${isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
                  >
                    {size.name}
                  </div>
                );
              })}
            </div>
            {form.formState.errors.sizeIds && <p className="text-xs text-destructive">{form.formState.errors.sizeIds.message as string}</p>}
          </div>

          {/* Colors */}
          <div className="space-y-3">
            <label className="text-sm font-medium leading-none">Colors</label>
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => {
                const isSelected = form.watch('colorIds')?.includes(color.id);
                return (
                  <div 
                    key={color.id} 
                    onClick={() => toggleSelection('colorIds', color.id)}
                    className={`flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 text-sm font-semibold transition-all ${isSelected ? 'bg-secondary border-primary' : 'bg-background hover:bg-muted'}`}
                  >
                    <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: color.value }} />
                    {color.name}
                  </div>
                );
              })}
            </div>
            {form.formState.errors.colorIds && <p className="text-xs text-destructive">{form.formState.errors.colorIds.message as string}</p>}
          </div>
        </div>

        {/* DYNAMIC INVENTORY MATRIX */}
        {form.watch('variants') && (form.watch('variants') || []).length > 0 && (
          <div className="space-y-4 rounded-lg border p-4 bg-muted/10">
            <div className="flex items-center gap-2">
              <Box className="h-5 w-5 text-muted-foreground" />
              <label className="text-sm font-medium leading-none">Inventory & Variants</label>
            </div>
            <p className="text-sm text-muted-foreground">
              Manage stock for each variant combination.
            </p>
            
            <div className="rounded-md border bg-background">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-10 px-4 text-left font-medium">Size</th>
                    <th className="h-10 px-4 text-left font-medium">Color</th>
                    <th className="h-10 px-4 text-left font-medium w-[150px]">Stock Count</th>
                  </tr>
                </thead>
                <tbody>
                  {form.watch('variants')?.map((variant, index: number) => {
                    const size = sizes.find(s => s.id === variant.sizeId);
                    const color = colors.find(c => c.id === variant.colorId);
                    return (
                      <tr key={`${variant.sizeId}-${variant.colorId}`} className="border-b last:border-0">
                        <td className="px-4 py-2 font-medium">{size?.name || 'Unknown'}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full border" style={{ backgroundColor: color?.value }} />
                            {color?.name || 'Unknown'}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <Input 
                            type="number"
                            min="0"
                            className="h-8"
                            {...form.register(`variants.${index}.stock`)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Tags</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.watch('tags')?.map((tag: string) => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1 pr-1">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <Input 
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder="Type and press Enter to add tags..."
            disabled={loading}
          />
        </div>

        {/* Product Attributes (Metadata) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium leading-none">Product Attributes</label>
            <Button type="button" variant="outline" size="sm" onClick={() => appendMetadata({ key: "", value: "" })}>
              <Plus className="mr-2 h-4 w-4" /> Add Field
            </Button>
          </div>
          
          {metadataFields.length === 0 && <p className="text-sm text-muted-foreground italic">No custom attributes added (e.g. Material, Origin).</p>}

          {metadataFields.map((field, index) => (
            <div key={field.id} className="flex gap-4 items-start">
              <div className="grid gap-1 flex-1">
                <Input {...form.register(`metadata.${index}.key`)} placeholder="Key (e.g. Material)" />
                {form.formState.errors.metadata?.[index]?.key && <p className="text-xs text-destructive">Required</p>}
              </div>
              <div className="grid gap-1 flex-1">
                <Input {...form.register(`metadata.${index}.value`)} placeholder="Value (e.g. 100% Cotton)" />
                {form.formState.errors.metadata?.[index]?.value && <p className="text-xs text-destructive">Required</p>}
              </div>
              <Button type="button" variant="destructive" size="icon" onClick={() => removeMetadata(index)}>
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
            <Switch 
              checked={form.watch('isFeatured')}
              onChange={(e) => form.setValue('isFeatured', e.target.checked)}
            />
            <div className="space-y-1 leading-none">
              <label className="font-medium">Featured</label>
              <p className="text-sm text-muted-foreground">This product will appear on the home page.</p>
            </div>
          </div>
          
          <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
            <Switch 
              checked={form.watch('isArchived')}
              onChange={(e) => form.setValue('isArchived', e.target.checked)}
            />
            <div className="space-y-1 leading-none">
              <label className="font-medium">Archived</label>
              <p className="text-sm text-muted-foreground">This product will not appear anywhere in the store.</p>
            </div>
          </div>
        </div>

        <Button disabled={loading} className="ml-auto" type="submit">
          {action}
        </Button>
      </form>
    </>
  );
}
