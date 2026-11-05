ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.public_vouchers()
 RETURNS TABLE(code text, discount_type text, value numeric, min_spend numeric, expires_at timestamp with time zone, shop_name text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT c.code, c.discount_type, c.value, c.min_spend, c.expires_at, sp.shop_name
  FROM public.coupons c
  LEFT JOIN public.seller_profiles sp ON sp.user_id = c.seller_id
  WHERE c.active AND c.is_public AND (c.expires_at IS NULL OR c.expires_at > now())
    AND (c.max_uses IS NULL OR c.used_count < c.max_uses)
    AND (c.seller_id IS NULL OR sp.status = 'approved')
  ORDER BY c.created_at DESC
  LIMIT 50
$function$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['set_seller_slug()','handle_new_user()','log_order_status()','set_order_item_seller()','notify_buyer_fulfillment()','notify_new_message()','guard_seller_verification()','touch_conversation()','set_review_seller()','notify_low_stock()','notify_new_order_item()','credit_seller_on_delivery()','enforce_product_limit()','decrement_stock_on_order_item()','restore_stock_on_order_item_delete()','restore_stock_on_order_cancel()','escrow_on_delivery()']
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', f);
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.confirm_order_received(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.release_seller_escrow(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.active_seller_plan(uuid) FROM PUBLIC, anon;