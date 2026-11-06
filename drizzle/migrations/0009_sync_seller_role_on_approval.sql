CREATE OR REPLACE FUNCTION public.sync_seller_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, 'seller')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF NEW.status = 'suspended' THEN
    DELETE FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'seller';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.sync_seller_role() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_sync_seller_role ON public.seller_profiles;
CREATE TRIGGER trg_sync_seller_role AFTER INSERT OR UPDATE OF status ON public.seller_profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_seller_role();
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'seller' FROM public.seller_profiles WHERE status = 'approved'
ON CONFLICT (user_id, role) DO NOTHING;
DELETE FROM public.user_roles ur USING public.seller_profiles sp
WHERE ur.user_id = sp.user_id AND ur.role = 'seller' AND sp.status = 'suspended';