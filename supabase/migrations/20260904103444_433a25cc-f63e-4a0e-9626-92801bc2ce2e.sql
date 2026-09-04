CREATE OR REPLACE FUNCTION public.restore_stock_on_order_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled')
     OR (NEW.payment_status IN ('failed','cancelled') AND OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN
    UPDATE public.products p
      SET stock = p.stock + oi.qty
      FROM public.order_items oi
      WHERE oi.order_id = NEW.id AND oi.product_id = p.id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.restore_stock_on_order_cancel() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_restore_stock_on_cancel ON public.orders;
CREATE TRIGGER trg_restore_stock_on_cancel
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.restore_stock_on_order_cancel();