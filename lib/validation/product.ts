import { z } from 'zod';

const emptyToNull = (value: string | null | undefined) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return value;
};

const uuidOrEmpty = z.union([z.string().uuid(), z.literal(''), z.null(), z.undefined()]);

export const productVariantSchema = z.object({
  sizeId: uuidOrEmpty.transform(emptyToNull),
  colorId: uuidOrEmpty.transform(emptyToNull),
  stock: z.number().min(0),
});

export const productPayloadSchema = z.object({
  storeId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().min(1),
  images: z.array(z.string().url()).min(1),
  price: z.number().min(0),
  stock: z.number().min(0),
  categoryId: uuidOrEmpty.transform(emptyToNull),
  colorIds: z.array(z.string().uuid()).min(1),
  sizeIds: z.array(z.string().uuid()).min(1),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string()).optional().default({}),
  variants: z.array(productVariantSchema).default([]),
  isFeatured: z.boolean(),
  isArchived: z.boolean(),
});
