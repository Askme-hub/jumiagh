CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications (user_id, read, created_at DESC);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Low-stock alert: notify the seller when a product's stock drops to 3 or fewer
CREATE OR REPLACE FUNCTION public.notify_low_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.seller_id IS NOT NULL
     AND NEW.stock <= 3
     AND NEW.stock < OLD.stock
     AND NOT EXISTS (
       SELECT 1 FROM public.notifications
       WHERE user_id = NEW.seller_id
         AND type = 'low_stock'
         AND title = 'Low stock: ' || NEW.name
         AND read = false
     ) THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      NEW.seller_id,
      'low_stock',
      'Low stock: ' || NEW.name,
      CASE WHEN NEW.stock = 0 THEN 'This product is out of stock. Restock to keep selling.'
           ELSE 'Only ' || NEW.stock || ' unit(s) left. Consider restocking soon.' END,
      '/seller/products'
    );
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_low_stock() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_low_stock
  AFTER UPDATE OF stock ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_low_stock();

-- New-order alert: notify the seller when one of their items is ordered
CREATE OR REPLACE FUNCTION public.notify_new_order_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.seller_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      NEW.seller_id,
      'new_order',
      'New order: ' || NEW.name,
      NEW.qty || ' unit(s) ordered. Check your orders to fulfill it.',
      '/seller/orders'
    );
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_new_order_item() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_notify_new_order
  AFTER INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_order_item();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;