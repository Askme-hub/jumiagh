CREATE OR REPLACE FUNCTION public.public_vouchers()
RETURNS TABLE(code text, discount_type text, value numeric, min_spend numeric, expires_at timestamptz, shop_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.code, c.discount_type, c.value, c.min_spend, c.expires_at, sp.shop_name
  FROM public.coupons c
  LEFT JOIN public.seller_profiles sp ON sp.user_id = c.seller_id
  WHERE c.active AND (c.expires_at IS NULL OR c.expires_at > now())
    AND (c.max_uses IS NULL OR c.used_count < c.max_uses)
    AND (c.seller_id IS NULL OR sp.status = 'approved')
  ORDER BY c.created_at DESC
  LIMIT 50
$$;
REVOKE ALL ON FUNCTION public.public_vouchers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_vouchers() TO anon, authenticated;