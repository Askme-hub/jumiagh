## 1. Brand → Kivora

- Save uploaded icon and wordmark to `src/assets/kivora-icon.png` and `src/assets/kivora-logo.png` (done).
- Use the icon in:
  - `Preloader` (replace bouncing ShoppingCart with Kivora icon, keep beeping rings)
  - `SearchBar` / top header (small logo)
  - Favicon + `__root.tsx` meta (title, og:image)
- Use the wordmark on `/login` and the homepage hero badge.
- Update titles/meta from "jumia gh" → "Kivora Ghana — Everything You Need".

## 2. Responsive (mobile + desktop)

Right now `__root.tsx` hard-locks `max-w-md mx-auto` and shows `BottomNav` on every viewport.

- Remove the `max-w-md` lock; switch to a responsive container (`w-full` with inner `max-w-7xl` per page).
- Show `BottomNav` only on mobile (`md:hidden`); add a `TopNav` (logo + search + Home/Categories/Cart/Wishlist/Orders/Account + Sell) for `md:` and up.
- Drop the `pb-16` on desktop.
- Audit key pages (home, categories, product details, cart, checkout, orders, admin) and switch hard `grid-cols-2` / fixed widths to responsive `sm: md: lg:` grids. Most product grids already have `md:grid-cols-3 lg:grid-cols-4` — extend that pattern where missing.

## 3. Seller system

### Roles
- Add `'seller'` to the `app_role` enum.
- Admin UI to assign/revoke seller role on a user (new tab in `/admin`).

### Schema changes (migration)
- `seller_profiles` table: `user_id` (pk/fk to auth.users), `shop_name`, `bio`, `logo_url`, `phone`, `status` (`pending`/`approved`/`suspended`), timestamps. RLS: seller reads/updates own; admin all; public read of approved.
- `products`: add `seller_id uuid null`, `approval_status text default 'approved'` (admin-created stays approved; seller-created starts `pending`).
- RLS update on `products`:
  - public SELECT only where `approval_status = 'approved'`
  - sellers can INSERT/UPDATE/DELETE their own rows (`seller_id = auth.uid()`)
  - admins keep full access and can change `approval_status`
- Storage bucket `product-images` (public read; sellers write to their own `user_id/` folder).

### Seller UI
- `/seller` layout (guard: must have seller role + approved profile, else show "apply to become a seller" form that creates a `pending` `seller_profiles` row).
- `/seller/products` — list seller's own products with approval status badges, edit/delete.
- `/seller/products/new` and `/seller/products/$id` — form with image upload to storage, name, price, old_price, stock, category, description.
- `/seller/orders` — orders containing the seller's items (read-only).

### Admin additions
- `/admin/sellers` — list seller_profiles, approve/suspend, assign/revoke seller role.
- `/admin/products` — add filter by approval_status, allow approve/reject of pending seller products.

## Technical notes

- Use `createServerFn` with `requireSupabaseAuth` for seller actions that need RLS-as-user; admin role checks use the existing `has_role` function via RLS — no admin client needed for these flows.
- File uploads from browser go through the standard supabase-js storage client (RLS-scoped by `auth.uid()` folder).
- All new tables follow the GRANT + RLS pattern.
- Keep existing pages working: products list already filters via RLS, so adding `approval_status = 'approved'` policy is transparent to buyers.

## Order of execution

1. Brand assets + responsive shell (TopNav, container, BottomNav mobile-only, Preloader/Login/meta).
2. DB migration (enum, seller_profiles, products columns, storage bucket, RLS).
3. Seller routes + apply flow + product CRUD with image upload.
4. Admin seller management + product approval.

This is one cohesive ship; I'll do it in that order in a single pass after you approve.
