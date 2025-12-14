<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Commerce CMS

Supabase-backed multi-store commerce console built with Next.js 14 App Router, React 18, and Tailwind. The legacy Vite/mock layer has been replaced with first-class Supabase Auth, Postgres, and storage integrations so the dashboard reflects live data.

## Architecture at a Glance

- **Frontend** – Next.js App Router with server components for data fetching and client components for interactive forms/tables. Authentication flows rely on `@supabase/auth-helpers-nextjs` for server/browser contexts plus middleware-protected routes.
- **API layer** – Next Route Handlers proxy CRUD traffic to Supabase using the service role key on the server only. Client hooks (SWR) talk to these handlers for optimistic UI updates.
- **Database** – Supabase Postgres stores all commerce entities plus helper enums, domain constraints, triggers for stock rollups, and view/function helpers for dashboard charts.
- **Auth** – Supabase GoTrue configured for RS256 JWT signing with project-specific RSA keys stored via `supabase secrets set`. Middleware ensures only authenticated users with `store_members` entries can reach dashboard routes.

## Data Model & Derived Metrics

| Entity | Description | Key Relations & Indexes |
| --- | --- | --- |
| `stores` | Logical tenant. Includes branding/support info and owner `user_id`. | FK: `user_id → auth.users.id`. Unique constraint on `(user_id, name)` prevents duplicates. Indexed by `user_id`. |
| `store_members` | ACL list so multiple Supabase users can administer a store. | FK to `stores` + `auth.users`. Unique `(store_id, user_id)` and indexes for lookup. |
| `billboards` | Hero marketing banners per store. | FK `store_id`. Indexed by `store_id`. |
| `categories` | Product taxonomy references optional billboard. | FK to `stores` and `billboards`. Unique `(store_id, lower(name))`. Indexed by `store_id`. |
| `sizes` / `colors` | Variant dimensions scoped per store. | Unique `(store_id, lower(value))`. Indexed by `store_id`. |
| `products` | Core catalog item with cached `stock_cached`, tag arrays, JSONB metadata. | FK `store_id`, `category_id`. Indexed by `store_id` + `category_id`. Trigger keeps `stock_cached` synced with variants. |
| `product_images` | Ordered gallery w/ primary image flag. | FK `product_id`. Index on `product_id`. |
| `product_variants` | Size/color/SKU combos. | FK `product_id`, `size_id`, `color_id`. Partial unique index ensures each product-size-color tuple occurs once. |
| `orders` | Checkout header with payment + fulfillment state. | FK `store_id`. Enums enforce `order_status` + `payment_method`. Index on `(store_id, created_at desc)` powers dashboards. |
| `order_items` | Line items w/ optional variant pointer. | FK `order_id`, `product_id`, `variant_id`. |
| `inventory_adjustments` | Audit trail for manual stock mutations. | FK into product/variant plus actor `user_id`. |

### Enums & Domains

- `order_status`: `pending`, `processing`, `completed`, `cancelled`.
- `payment_method`: `cod`, `card`, `bkash`.
- `member_role`: `owner`, `manager`, `viewer`.
- Boolean flags like `products.is_featured` / `.is_archived` remain plain columns with indexes driven by downstream needs (e.g., featured queries).

### Derived Data Strategy

- **Stock totals** – `product_variants` rows trigger `public.refresh_product_stock`, which updates `products.stock_cached`. APIs read from cached totals to avoid recomputing per render.
- **Graph rollups** – `store_monthly_revenue` view produces 12-month revenue windows (paid + processing/completed orders). A helper `get_monthly_revenue(store_id uuid)` SQL function wraps the view for API calls, and an optional materialized view (`store_monthly_revenue_mv`) can be refreshed during nightly jobs for heavy dashboards.
- **RLS helper** – `is_member_of_store(store_id uuid)` centralizes policy checks so every table simply calls into it.

### Recommended Indexes

- `products_store_is_featured_idx` on `(store_id, is_featured)` to serve featured-carousels.
- `orders_store_created_idx` already defined to power time-series graphing.
- `product_variants_product_idx` / `order_items_order_idx` for join-heavy API endpoints.

These live definitions are codified in `supabase/migrations/*` so local environments and Supabase-hosted infrastructure stay in sync.

## Auth & RSA Setup

Supabase GoTrue is locked to RS256 so only RSA keys issued by you can mint JWTs. Generate keys locally (or in CI), store the **private** portion as a Supabase secret, and only commit placeholders:

```bash
openssl genrsa -out supabase-jwt-private.key 2048
openssl rsa -in supabase-jwt-private.key -pubout -out supabase-jwt-public.key

# Upload secrets to your hosted project (never commit the private file)
supabase secrets set \
  SUPABASE_JWT_PRIVATE_KEY="$(cat supabase-jwt-private.key)" \
  SUPABASE_JWT_PUBLIC_KEY="$(cat supabase-jwt-public.key)"
```

For local dev copy the values into `.env.local`. `supabase/config.toml` is already configured with `jwt_signing_method = "rs256"` plus redirect URLs expected by the Next auth callback (`/auth/callback`). The middleware + route handlers in this repo rely on `@supabase/auth-helpers-nextjs` to keep browser/server cookies synchronized so every dashboard request enforces session ownership automatically.

## Environment Setup

1. **Install tooling**
   - [Node.js 20+](https://nodejs.org/)
   - [Supabase CLI](https://supabase.com/docs/guides/cli)
   - `openssl` (or another utility) to mint RSA keys.
2. **Clone & install deps**
   ```bash
   npm install
   ```
3. **Populate env vars**
   - Copy `env.example` to `.env.local`.
   - Fill in `NEXT_PUBLIC_SUPABASE_URL`, anon key, service role key, and RSA secrets.
   - When running against the local Supabase containers you can keep the defaults shipped in the example file.
4. **Sync database**
   ```bash
   # Spin up Supabase containers (+ Studio + GoTrue + storage)
   npm run supabase:start

   # Push the latest migration + seed data
   npm run supabase:migrate

   # Optional: regenerate TypeScript bindings if you add tables
   npm run supabase:types
   ```
5. **Start Next.js**
   ```bash
   npm run dev
   ```
   The dashboard lives at `http://localhost:3000`. `supabase start` seeds a demo store bound to the first auth user in the local stack (`admin@example.com`). Use the Login page to request a magic link and authenticate.

## Features Overview

### 🎨 Billboard Management with Live Preview
- **Split-screen editor** showing real-time preview of text overlays on background images
- Create, edit, and delete hero banners
- Preview exactly how billboards will appear before saving

### 📦 Complete Product Management
- **Full CRUD operations** with automatic variant generation
- **Multiple image uploads** with main image designation
- **Dynamic metadata** using key-value pairs (Material, Origin, etc.)
- **Client-side search and filtering** by name, category, and status
- Category assignment and tagging
- Featured/Archived product flags

### 📊 Advanced Inventory Control
- **Matrix view** separating simple products from complex variants
- **Granular stock management** for specific size/color combinations
- **Visual status indicators**: In Stock, Low Stock (<10), Out of Stock
- **Bulk saving** with optimistic UI updates
- Real-time stock total calculations

### 🛒 Order Management with Local Market Logic
- **Status workflow**: Pending → Processing → Completed → Cancelled
- **Payment tracking** with localized logic:
  - COD unpaid orders show in **Orange** (Pending Collection) not Red
  - Support for COD, BKash, and Card payments
- In-line status and payment updates
- Complete order history with customer details

### 🏷️ Catalog Organization
- **Categories**: Full CRUD with billboard linking
- **Sizes**: Manage size variants (S, M, L, XL, etc.)
- **Colors**: Visual color picker with hex values
- All catalog options available during product creation

### ⚙️ Store Settings & Branding
- Store name, description, and support email management
- Logo upload and preview
- **Danger Zone**: Secure store deletion with:
  - Type-to-confirm pattern
  - Cascade deletion of all associated data
  - Automatic sign-out after deletion

### 📈 Dashboard Analytics
- **KPI Cards**: Total Revenue, Sales Count, Products in Stock, Customers
- **Revenue Chart**: 12-month bar chart with paid/completed orders
- **Recent Activity**: Latest 5 orders with status and payment info

### 🎯 User Experience Features
- **Collapsible navigation** with Catalog submenu
- **Loading spinners** during async operations
- **Confirmation dialogs** for destructive actions
- **Optimistic UI updates** for better perceived performance
- **Responsive design** with Tailwind CSS
- **Accessible components** based on Radix primitives

## Testing & Verification

Manual pass/fail checklist for changes:

### Authentication
- **Auth flow** – Visit `/auth/login`, request a magic link, ensure redirect lands back on the dashboard and middleware blocks anonymous access to `/[storeId]/**`.

### Dashboard
- **Dashboard metrics** – Confirm cards + revenue chart update after inserting new paid orders via Supabase Studio.

### Products & Inventory
- **Products CRUD** – Create a product with multiple variants, edit it, and verify rows are written to `products`, `product_images`, and `product_variants`. Archiving/unarchiving should reflect on the Products table.
- **Product search/filter** – Test search by product name, filter by category and status (active, featured, archived, out of stock).
- **Inventory matrix** – Edit variant stock levels, verify the bulk save functionality and optimistic UI updates.

### Billboards
- **Billboard live preview** – Create/edit billboards and confirm the split-screen preview updates in real-time.
- **Billboard CRUD** – Delete banners and verify they're removed from the UI.

### Catalog Management
- **Categories** – Create, edit, and delete categories. Link them to billboards and assign to products.
- **Sizes** – Create size variants (S, M, L) and verify they appear in product variant generation.
- **Colors** – Create colors with hex picker, verify they appear with color preview in the UI.

### Orders
- **Orders workflow** – Toggle order status through the workflow (pending → processing → completed).
- **Payment management** – Toggle payment status and verify COD unpaid orders display in orange, not red.

### Settings
- **Store settings** – Update name/logo/support email and ensure sidebar + metadata update accordingly.
- **Danger Zone** – Test the store deletion flow (use a test store!) and verify cascade deletion works.
