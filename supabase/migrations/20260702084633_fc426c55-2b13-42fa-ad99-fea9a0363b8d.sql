-- 1. Hide seller phone from anonymous reads via column-level security
REVOKE SELECT ON public.seller_profiles FROM anon;
GRANT SELECT (user_id, shop_name, bio, logo_url, status, created_at, updated_at)
  ON public.seller_profiles TO anon;

-- 2. Allow admins to delete orders (fail-closed today: no DELETE policy)
CREATE POLICY "orders admin delete" ON public.orders
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Remove anon/public EXECUTE on SECURITY DEFINER helper (authenticated retains it for RLS)
REVOKE EXECUTE ON FUNCTION public.is_order_seller(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_order_seller(uuid, uuid) FROM anon;