# Kivora Multi-Vendor Marketplace Upgrade

Your project already has the foundation: `seller` role, `seller_profiles`, `products` with `approval_status`/`seller_id`, admin seller management, product CRUD with image upload, orders, order status history, and an inbox. This plan builds the remaining marketplace systems on top of that, in phases so each ships stable.

I recommend we build phase by phase (approve this overall direction, then I'll execute Phase 1 first and check in). Trying to ship everything in one pass would be unstable.

## Scope decisions
- **Reuse, don't rebuild**: extend existing tables/routes instead of creating parallel `users`/`sellers`/`seller_shops` (your `profiles` + `user_roles` + `seller_profiles` already cover these).
- **Payments**: build the wallet + withdrawal *architecture and workflow* (requests, approval states, history). Actual payout rails (bank/MoMo/crypto) are recorded as manual admin-marked payouts for now — live disbursement APIs are a later integration.
- **Defer** the "advanced" wishlist (affiliate, AI recommendations, multi-language, subscription plans, abandoned cart, crypto disbursement) to a final optional phase — these are each large features on their own.

---

## Phase 1 — Seller order management + customer info
Sellers need to see and fulfill orders for their products.
- DB: ensure `order_items.seller_id` is populated (add column + backfill from product); migration.
- `/seller/orders` — list orders containing the seller's items, with customer name/phone/email, delivery address, products purchased, totals.
- `/seller/orders/$id` — detail view; update fulfillment status (processing → shipped → delivered) scoped to the seller's items; printable receipt/invoice view.
- RLS: sellers read order/customer data only for orders containing their products (security-definer helper).

## Phase 2 — Seller wallet + withdrawals
- DB: `seller_wallets` (balance, pending, total_earned, total_withdrawn, commission_deducted), `withdrawal_requests` (amount, method, status: pending/approved/rejected/paid, destination details), `transactions` (ledger: sale, commission, withdrawal). Earnings credited on order delivered, minus commission.
- `/seller/wallet` — balance cards + transaction history + request withdrawal form (bank / mobile money).
- `/admin/withdrawals` — review queue: approve / reject / mark paid; export CSV.
- Commission: marketplace-wide default in a `settings` table, with optional per-category / per-seller override.

## Phase 3 — Messaging (customer ↔ seller)
- DB: `conversations` + `messages` (between a customer and a seller, optionally tied to an order/product), Realtime enabled.
- Customer: message a seller from product/shop/order pages; inbox chat thread.
- Seller: `/seller/messages` inbox with threads, reply, order updates.
- Realtime notifications via Supabase Realtime + toast.

## Phase 4 — Reviews & ratings
- DB: `reviews` (product + seller reviews, rating 1–5, body, verified-purchase flag), aggregate seller rating.
- Customer: leave product review (only for purchased items), view on product/shop pages.
- Seller: view reviews, reply, report abuse.
- Public shop page shows average rating.

## Phase 5 — Public shop pages + SEO
- `/shop/$slug` — public storefront: banner, logo, description, rating, the seller's approved products.
- Add `slug`, `banner_url` to `seller_profiles`; per-shop SEO `head()` (title/description/og).
- KYC fields on seller application (business name, ID doc upload to a private bucket); admin verification UI.

## Phase 6 — Analytics + notifications
- `/seller` dashboard: daily/weekly/monthly/yearly sales, top products, revenue chart (Recharts), order counts — derived from orders/order_items.
- DB: `notifications` table (typed: new_order, new_message, product_approved/rejected, withdrawal_approved/rejected, new_review, low_stock). Notification bell + list; low-stock auto-alerts.
- `/admin` financial dashboard: marketplace revenue, commission earnings, withdrawal stats.

## Phase 7 (optional, later) — Advanced
Product variants, bulk upload, coupons/flash sales/featured, premium badges, referral/affiliate, multi-currency, AI recommendations. Each scoped individually when you're ready.

---

## Technical architecture
- **Backend**: TanStack `createServerFn` (+ `requireSupabaseAuth`) for seller/admin actions that need elevated or cross-user reads; browser Supabase client (RLS) for simple owner-scoped reads. Webhooks/payouts via server routes under `/api/public/*`.
- **Security (RBAC)**: keep roles in `user_roles` + `has_role()`. New RLS on every table — sellers see only their own rows, customers their own, admins all. Security-definer helpers for cross-table checks (e.g. "is this order's item mine?") to avoid recursive RLS. Zod validation on all server-fn inputs. Private storage buckets for KYC docs.
- **Each migration**: CREATE TABLE → GRANT → ENABLE RLS → POLICIES, with `service_role` grants and triggers for `updated_at` and wallet credits.
- **Realtime**: messaging + notifications via `supabase_realtime` publication.
- **Charts**: existing `recharts` (shadcn chart component already present).

## Page/route map (new)
```
/seller/orders, /seller/orders/$id
/seller/wallet
/seller/messages
/seller/reviews
/shop/$slug                      (public)
/admin/withdrawals
/admin/disputes
/account → reviews, messages, refund requests
```

---

If you approve, I'll start with **Phase 1 (seller order management)** and report back before moving to Phase 2. Tell me if you'd rather reorder phases (e.g. wallet first, or messaging first).