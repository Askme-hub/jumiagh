CREATE OR REPLACE FUNCTION public.decrement_stock_on_order_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock integer;
BEGIN
  IF NEW.product_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT stock INTO v_stock FROM public.products WHERE id = NEW.product_id FOR UPDATE;
  IF v_stock IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_stock < NEW.qty THEN
    RAISE EXCEPTION 'Only % unit(s) left in stock for %', v_stock, NEW.name;
  END IF;

  UPDATE public.products
    SET stock = GREATEST(stock - NEW.qty, 0)
    WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_stock_on_order_item() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_decrement_stock ON public.order_items;
CREATE TRIGGER trg_decrement_stock
AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.decrement_stock_on_order_item();

CREATE OR REPLACE FUNCTION public.restore_stock_on_order_item_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.product_id IS NOT NULL THEN
    UPDATE public.products SET stock = stock + OLD.qty WHERE id = OLD.product_id;
  END IF;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.restore_stock_on_order_item_delete() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_restore_stock ON public.order_items;
CREATE TRIGGER trg_restore_stock
AFTER DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.restore_stock_on_order_item_delete();