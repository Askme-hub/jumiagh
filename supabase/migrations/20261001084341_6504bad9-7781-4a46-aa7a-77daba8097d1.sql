ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'not_verified',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS verification_note text,
  ADD COLUMN IF NOT EXISTS verification_requested_at timestamptz;

ALTER TABLE public.seller_profiles
  DROP CONSTRAINT IF EXISTS seller_profiles_verification_status_check;
ALTER TABLE public.seller_profiles
  ADD CONSTRAINT seller_profiles_verification_status_check
  CHECK (verification_status IN ('not_verified','pending','verified','rejected'));

CREATE TABLE IF NOT EXISTS public.seller_verification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  actor_id uuid,
  action text NOT NULL,
  old_status text,
  new_status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.seller_verification_log TO authenticated;
GRANT ALL ON public.seller_verification_log TO service_role;

ALTER TABLE public.seller_verification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verification log read" ON public.seller_verification_log;
CREATE POLICY "verification log read" ON public.seller_verification_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR seller_id = auth.uid());

CREATE OR REPLACE FUNCTION public.guard_seller_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean := public.has_role(auth.uid(), 'admin');
BEGIN
  IF is_admin THEN
    IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
      IF NEW.verification_status = 'verified' THEN
        NEW.verified_at := now();
        NEW.verified_by := auth.uid();
      ELSE
        NEW.verified_at := NULL;
        NEW.verified_by := NULL;
      END IF;
      INSERT INTO public.seller_verification_log(seller_id, actor_id, action, old_status, new_status, note)
      VALUES (NEW.user_id, auth.uid(), 'admin_' || NEW.verification_status, OLD.verification_status, NEW.verification_status, NEW.verification_note);
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF NEW.user_id = auth.uid()
       AND NEW.verification_status = 'pending'
       AND OLD.verification_status IN ('not_verified','rejected') THEN
      NEW.verification_requested_at := now();
      NEW.verified_at := NULL;
      NEW.verified_by := NULL;
      NEW.verification_note := NULL;
      INSERT INTO public.seller_verification_log(seller_id, actor_id, action, old_status, new_status, note)
      VALUES (NEW.user_id, auth.uid(), 'seller_request', OLD.verification_status, 'pending', NULL);
      RETURN NEW;
    ELSE
      NEW.verification_status := OLD.verification_status;
    END IF;
  END IF;

  NEW.verified_at := OLD.verified_at;
  NEW.verified_by := OLD.verified_by;
  NEW.verification_note := OLD.verification_note;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_seller_verification() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_seller_verification ON public.seller_profiles;
CREATE TRIGGER trg_guard_seller_verification
  BEFORE UPDATE ON public.seller_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_seller_verification();

DROP FUNCTION IF EXISTS public.public_store(text);
CREATE FUNCTION public.public_store(_slug text)
 RETURNS TABLE(user_id uuid, slug text, shop_name text, bio text, logo_url text, banner_url text, location text, whatsapp_number text, business_category text, status text, created_at timestamp with time zone, product_count bigint, verification_status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT sp.user_id, sp.slug, sp.shop_name, sp.bio, sp.logo_url, sp.banner_url,
         sp.location, sp.whatsapp_number, sp.business_category, sp.status, sp.created_at,
         (SELECT count(*) FROM public.products p
            WHERE p.seller_id = sp.user_id AND p.approval_status = 'approved'),
         CASE WHEN sp.status = 'approved' AND sp.verification_status = 'verified'
              THEN 'verified' ELSE 'not_verified' END
  FROM public.seller_profiles sp
  WHERE sp.slug = _slug AND sp.status = 'approved'
$function$;
GRANT EXECUTE ON FUNCTION public.public_store(text) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.public_stores();
CREATE FUNCTION public.public_stores()
 RETURNS TABLE(slug text, shop_name text, logo_url text, banner_url text, location text, business_category text, product_count bigint, verification_status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT sp.slug, sp.shop_name, sp.logo_url, sp.banner_url, sp.location, sp.business_category,
         (SELECT count(*) FROM public.products p
            WHERE p.seller_id = sp.user_id AND p.approval_status = 'approved'),
         CASE WHEN sp.status = 'approved' AND sp.verification_status = 'verified'
              THEN 'verified' ELSE 'not_verified' END
  FROM public.seller_profiles sp
  WHERE sp.status = 'approved' AND sp.slug IS NOT NULL
  ORDER BY sp.created_at DESC
$function$;
GRANT EXECUTE ON FUNCTION public.public_stores() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_seller_badge(_seller_id uuid)
 RETURNS TABLE(shop_name text, slug text, logo_url text, verified boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT sp.shop_name, sp.slug, sp.logo_url,
         (sp.status = 'approved' AND sp.verification_status = 'verified')
  FROM public.seller_profiles sp
  WHERE sp.user_id = _seller_id AND sp.status = 'approved'
$function$;
GRANT EXECUTE ON FUNCTION public.public_seller_badge(uuid) TO anon, authenticated;