ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS business_category text;

CREATE OR REPLACE FUNCTION public.slugify(_txt text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT nullif(trim(both '-' from regexp_replace(lower(coalesce(_txt,'')), '[^a-z0-9]+', '-', 'g')), '')
$$;

CREATE OR REPLACE FUNCTION public.unique_shop_slug(_name text, _user_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE base text; candidate text; n int := 1;
BEGIN
  base := coalesce(public.slugify(_name), 'shop');
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.seller_profiles sp WHERE sp.slug = candidate AND sp.user_id <> _user_id) LOOP
    n := n + 1;
    candidate := base || '-' || n;
  END LOOP;
  RETURN candidate;
END;
$$;

UPDATE public.seller_profiles sp
SET slug = public.unique_shop_slug(sp.shop_name, sp.user_id)
WHERE sp.slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS seller_profiles_slug_key ON public.seller_profiles (slug);

CREATE OR REPLACE FUNCTION public.set_seller_slug()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.slug IS NULL OR btrim(NEW.slug) = '' OR (TG_OP = 'UPDATE' AND NEW.shop_name IS DISTINCT FROM OLD.shop_name AND NEW.slug IS NOT DISTINCT FROM OLD.slug AND OLD.slug = public.slugify(OLD.shop_name)) THEN
    NEW.slug := public.unique_shop_slug(NEW.shop_name, NEW.user_id);
  ELSE
    NEW.slug := public.unique_shop_slug(NEW.slug, NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_seller_slug() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_set_seller_slug ON public.seller_profiles;
CREATE TRIGGER trg_set_seller_slug
BEFORE INSERT OR UPDATE ON public.seller_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_seller_slug();

CREATE OR REPLACE FUNCTION public.public_store(_slug text)
RETURNS TABLE (
  user_id uuid,
  slug text,
  shop_name text,
  bio text,
  logo_url text,
  banner_url text,
  location text,
  whatsapp_number text,
  business_category text,
  status text,
  created_at timestamptz,
  product_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT sp.user_id, sp.slug, sp.shop_name, sp.bio, sp.logo_url, sp.banner_url,
         sp.location, sp.whatsapp_number, sp.business_category, sp.status, sp.created_at,
         (SELECT count(*) FROM public.products p
            WHERE p.seller_id = sp.user_id AND p.approval_status = 'approved')
  FROM public.seller_profiles sp
  WHERE sp.slug = _slug AND sp.status = 'approved'
$$;

GRANT EXECUTE ON FUNCTION public.public_store(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_stores()
RETURNS TABLE (
  slug text,
  shop_name text,
  logo_url text,
  banner_url text,
  location text,
  business_category text,
  product_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT sp.slug, sp.shop_name, sp.logo_url, sp.banner_url, sp.location, sp.business_category,
         (SELECT count(*) FROM public.products p
            WHERE p.seller_id = sp.user_id AND p.approval_status = 'approved')
  FROM public.seller_profiles sp
  WHERE sp.status = 'approved' AND sp.slug IS NOT NULL
  ORDER BY sp.created_at DESC
$$;

GRANT EXECUTE ON FUNCTION public.public_stores() TO anon, authenticated;