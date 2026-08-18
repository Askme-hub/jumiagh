GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_order_seller(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.active_seller_plan(uuid) TO anon, authenticated;