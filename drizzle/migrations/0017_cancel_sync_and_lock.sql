CREATE OR REPLACE FUNCTION public.sync_items_on_order_cancel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    UPDATE public.order_items SET fulfillment_status = 'cancelled' WHERE order_id = NEW.id;
  ELSIF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' THEN
    UPDATE public.order_items SET fulfillment_status = 'processing' WHERE order_id = NEW.id AND fulfillment_status = 'cancelled';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_items_on_order_cancel() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_sync_items_on_cancel ON public.orders;
CREATE TRIGGER trg_sync_items_on_cancel AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_items_on_order_cancel();

CREATE OR REPLACE FUNCTION public.guard_cancelled_order_items()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin')
     AND EXISTS (SELECT 1 FROM public.orders WHERE id = NEW.order_id AND status = 'cancelled') THEN
    RAISE EXCEPTION 'This order was cancelled. Only an admin can restore it.';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_cancelled_order_items() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_guard_cancelled_items ON public.order_items;
CREATE TRIGGER trg_guard_cancelled_items BEFORE UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.guard_cancelled_order_items();

UPDATE public.order_items oi SET fulfillment_status = 'cancelled'
FROM public.orders o WHERE o.id = oi.order_id AND o.status = 'cancelled';