-- 1. inbox_messages: broadcast readable only by authenticated users
DROP POLICY IF EXISTS "inbox read" ON public.inbox_messages;
CREATE POLICY "inbox read" ON public.inbox_messages
  FOR SELECT TO authenticated
  USING ((user_id = auth.uid()) OR (user_id IS NULL) OR has_role(auth.uid(), 'admin'::app_role));

-- 2. settings: readable only by authenticated users
DROP POLICY IF EXISTS "settings public read" ON public.settings;
CREATE POLICY "settings authenticated read" ON public.settings
  FOR SELECT TO authenticated
  USING (true);

-- 3. user_roles: explicit admin-only writes, self read remains
DROP POLICY IF EXISTS "roles admin all" ON public.user_roles;
CREATE POLICY "roles admin insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "roles admin update" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "roles admin delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. realtime.messages: restrict channel subscriptions to authenticated users
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated can access realtime" ON realtime.messages;
CREATE POLICY "authenticated can access realtime" ON realtime.messages
  FOR SELECT TO authenticated
  USING (true);

-- 5. Revoke EXECUTE on internal trigger-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.credit_seller_on_delivery() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_order_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_order_item_seller() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 6. storage: restrict listing of product-images to the user's own folder
DROP POLICY IF EXISTS "product-images public read" ON storage.objects;
CREATE POLICY "product-images list own" ON storage.objects
  FOR SELECT TO authenticated
  USING ((bucket_id = 'product-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]));