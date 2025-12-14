export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      stores: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          logo_url: string | null;
          support_email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          logo_url?: string | null;
          support_email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Database['public']['Tables']['stores']['Row'], 'id' | 'user_id'>> & {
          id?: string;
          user_id?: string;
        };
      };
      store_members: {
        Row: {
          id: string;
          store_id: string;
          user_id: string;
          role: 'owner' | 'manager' | 'viewer';
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          user_id: string;
          role?: 'owner' | 'manager' | 'viewer';
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['store_members']['Row']>;
      };
      billboards: {
        Row: {
          id: string;
          store_id: string;
          label: string;
          image_url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          label: string;
          image_url: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['billboards']['Row']>;
      };
      categories: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          billboard_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          name: string;
          billboard_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['categories']['Row']>;
      };
      sizes: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          value: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          name: string;
          value: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['sizes']['Row']>;
      };
      colors: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          value: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          name: string;
          value: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['colors']['Row']>;
      };
      products: {
        Row: {
          id: string;
          store_id: string;
          category_id: string | null;
          name: string;
          description: string | null;
          price: string;
          stock_cached: number;
          is_featured: boolean;
          is_archived: boolean;
          tags: string[];
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          category_id?: string | null;
          name: string;
          description?: string | null;
          price: string;
          stock_cached?: number;
          is_featured?: boolean;
          is_archived?: boolean;
          tags?: string[];
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['products']['Row']>;
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          url: string;
          position: number;
          is_primary: boolean;
        };
        Insert: {
          id?: string;
          product_id: string;
          url: string;
          position?: number;
          is_primary?: boolean;
        };
        Update: Partial<Database['public']['Tables']['product_images']['Row']>;
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          size_id: string | null;
          color_id: string | null;
          sku: string | null;
          stock: number;
          price_override: string | null;
        };
        Insert: {
          id?: string;
          product_id: string;
          size_id?: string | null;
          color_id?: string | null;
          sku?: string | null;
          stock?: number;
          price_override?: string | null;
        };
        Update: Partial<Database['public']['Tables']['product_variants']['Row']>;
      };
      orders: {
        Row: {
          id: string;
          store_id: string;
          customer_name: string | null;
          customer_email: string | null;
          phone: string | null;
          address: string | null;
          total_price: string;
          status: 'pending' | 'processing' | 'completed' | 'cancelled';
          payment_method: 'cod' | 'card' | 'bkash';
          is_paid: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          customer_name?: string | null;
          customer_email?: string | null;
          phone?: string | null;
          address?: string | null;
          total_price: string;
          status?: 'pending' | 'processing' | 'completed' | 'cancelled';
          payment_method?: 'cod' | 'card' | 'bkash';
          is_paid?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['orders']['Row']>;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          variant_id: string | null;
          quantity: number;
          unit_price: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          variant_id?: string | null;
          quantity?: number;
          unit_price: string;
        };
        Update: Partial<Database['public']['Tables']['order_items']['Row']>;
      };
      inventory_adjustments: {
        Row: {
          id: string;
          product_id: string | null;
          variant_id: string | null;
          previous_stock: number;
          new_stock: number;
          reason: string | null;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id?: string | null;
          variant_id?: string | null;
          previous_stock: number;
          new_stock: number;
          reason?: string | null;
          user_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['inventory_adjustments']['Row']>;
      };
    };
    Views: {
      store_monthly_revenue: {
        Row: {
          store_id: string | null;
          month_label: string | null;
          month_date: string | null;
          revenue: string | null;
        };
      };
    };
  };
};
