ALTER TABLE public.products ALTER COLUMN approval_status SET DEFAULT 'pending';

CREATE OR REPLACE FUNCTION public.guard_product_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.approval_status := 'pending';
  ELSE
    NEW.approval_status := OLD.approval_status;
    IF auth.uid() IS NOT NULL AND (
      NEW.name IS DISTINCT FROM OLD.name OR NEW.price IS DISTINCT FROM OLD.price
      OR NEW.description IS DISTINCT FROM OLD.description OR NEW.image_url IS DISTINCT FROM OLD.image_url
      OR NEW.category IS DISTINCT FROM OLD.category OR NEW.old_price IS DISTINCT FROM OLD.old_price
    ) THEN
      NEW.approval_status := 'pending';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.guard_product_approval() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_guard_product_approval BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.guard_product_approval();