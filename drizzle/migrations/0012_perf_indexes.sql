CREATE INDEX IF NOT EXISTS products_approval_created_idx ON public.products(approval_status, created_at DESC);
CREATE INDEX IF NOT EXISTS products_category_idx ON public.products(category);
CREATE INDEX IF NOT EXISTS seller_profiles_slug_idx ON public.seller_profiles(slug);
CREATE INDEX IF NOT EXISTS orders_user_created_idx ON public.orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS reviews_product_idx ON public.reviews(product_id);