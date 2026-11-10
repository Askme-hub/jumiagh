CREATE OR REPLACE FUNCTION public.sync_order_status_from_items()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total int; v_delivered int; v_shipped int; v_status text; v_new text;
BEGIN
  IF NEW.fulfillment_status IS NOT DISTINCT FROM OLD.fulfillment_status THEN RETURN NEW; END IF;
  SELECT status INTO v_status FROM public.orders WHERE id = NEW.order_id;
  IF v_status IN ('cancelled','pending_payment') THEN RETURN NEW; END IF;
  SELECT count(*) FILTER (WHERE fulfillment_status <> 'cancelled'),
         count(*) FILTER (WHERE fulfillment_status = 'delivered'),
         count(*) FILTER (WHERE fulfillment_status IN ('shipped','delivered'))
    INTO v_total, v_delivered, v_shipped
    FROM public.order_items WHERE order_id = NEW.order_id;
  IF v_total = 0 THEN RETURN NEW; END IF;
  IF v_delivered = v_total THEN v_new := 'delivered';
  ELSIF v_shipped = v_total THEN v_new := 'shipped';
  ELSE RETURN NEW; END IF;
  IF v_new IS DISTINCT FROM v_status THEN
    UPDATE public.orders SET status = v_new WHERE id = NEW.order_id;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.sync_order_status_from_items() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_sync_order_status_from_items
AFTER UPDATE OF fulfillment_status ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.sync_order_status_from_items();
UPDATE public.orders o SET status = 'delivered'
WHERE o.status NOT IN ('cancelled','delivered','pending_payment')
  AND EXISTS (SELECT 1 FROM public.order_items i WHERE i.order_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM public.order_items i WHERE i.order_id = o.id AND i.fulfillment_status NOT IN ('delivered','cancelled'));