
-- Dispatch tracking + escrow per item
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS rider_name text,
  ADD COLUMN IF NOT EXISTS rider_phone text,
  ADD COLUMN IF NOT EXISTS tracking_note text,
  ADD COLUMN IF NOT EXISTS seller_net numeric,
  ADD COLUMN IF NOT EXISTS escrow_release_at timestamptz,
  ADD COLUMN IF NOT EXISTS escrow_released boolean NOT NULL DEFAULT false;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_zone text;
ALTER TABLE public.seller_wallets ADD COLUMN IF NOT EXISTS escrow numeric NOT NULL DEFAULT 0;

-- Push subscriptions
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own push subs select" ON public.push_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own push subs insert" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own push subs update" ON public.push_subscriptions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own push subs delete" ON public.push_subscriptions FOR DELETE TO authenticated USING (user_id = auth.uid());

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS pushed boolean NOT NULL DEFAULT false;

-- Order issues / returns
CREATE TABLE public.order_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('return','damaged','wrong_item','not_received','other')),
  description text NOT NULL CHECK (char_length(description) BETWEEN 5 AND 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','rejected')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.order_issues TO authenticated;
GRANT ALL ON public.order_issues TO service_role;
ALTER TABLE public.order_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyer reads own issues" ON public.order_issues FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.is_order_seller(order_id, auth.uid()));
CREATE POLICY "buyer reports own delivered order" ON public.order_issues FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'open' AND admin_note IS NULL
    AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "admin updates issues" ON public.order_issues FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Escrow: on delivery, hold seller net in escrow for 48h
CREATE OR REPLACE FUNCTION public.escrow_on_delivery()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rate numeric; v_gross numeric; v_commission numeric; v_net numeric;
BEGIN
  IF NEW.fulfillment_status = 'delivered'
     AND OLD.fulfillment_status IS DISTINCT FROM 'delivered'
     AND NEW.seller_id IS NOT NULL AND NEW.seller_net IS NULL THEN
    SELECT commission / 100.0 INTO v_rate FROM public.subscription_plans
      WHERE id = public.active_seller_plan(NEW.seller_id);
    v_rate := coalesce(v_rate, 0.12);
    v_gross := NEW.price * NEW.qty;
    v_commission := round(v_gross * v_rate, 2);
    v_net := v_gross - v_commission;
    NEW.seller_net := v_net;
    NEW.escrow_release_at := now() + interval '48 hours';
    NEW.escrow_released := false;
    INSERT INTO public.seller_wallets (user_id, escrow, commission_paid)
    VALUES (NEW.seller_id, v_net, v_commission)
    ON CONFLICT (user_id) DO UPDATE SET
      escrow = public.seller_wallets.escrow + v_net,
      commission_paid = public.seller_wallets.commission_paid + v_commission,
      updated_at = now();
    INSERT INTO public.transactions (seller_id, type, amount, status, order_id, description)
    VALUES (NEW.seller_id, 'escrow', v_net, 'pending', NEW.order_id, 'Held 48h after delivery: ' || NEW.name);
    INSERT INTO public.transactions (seller_id, type, amount, order_id, description)
    VALUES (NEW.seller_id, 'commission', -v_commission, NEW.order_id, 'Commission on: ' || NEW.name);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.escrow_on_delivery() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_credit_seller_on_delivery ON public.order_items;
CREATE TRIGGER trg_escrow_on_delivery BEFORE UPDATE OF fulfillment_status ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.escrow_on_delivery();

-- Release due escrow (skips orders with an open issue)
CREATE OR REPLACE FUNCTION public.release_seller_escrow(_seller_id uuid)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total numeric := 0; r record;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> _seller_id AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  FOR r IN
    SELECT oi.id, oi.seller_net, oi.order_id, oi.name FROM public.order_items oi
    WHERE oi.seller_id = _seller_id AND oi.escrow_released = false
      AND oi.seller_net IS NOT NULL AND oi.escrow_release_at <= now()
      AND NOT EXISTS (SELECT 1 FROM public.order_issues i WHERE i.order_id = oi.order_id AND i.status = 'open')
    FOR UPDATE
  LOOP
    UPDATE public.order_items SET escrow_released = true WHERE id = r.id;
    v_total := v_total + r.seller_net;
    INSERT INTO public.transactions (seller_id, type, amount, order_id, description)
    VALUES (_seller_id, 'earning', r.seller_net, r.order_id, 'Sale released: ' || r.name);
  END LOOP;
  IF v_total > 0 THEN
    UPDATE public.seller_wallets SET
      escrow = greatest(0, escrow - v_total),
      balance = balance + v_total,
      total_earned = total_earned + v_total,
      updated_at = now()
    WHERE user_id = _seller_id;
  END IF;
  RETURN v_total;
END $$;
REVOKE ALL ON FUNCTION public.release_seller_escrow(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_seller_escrow(uuid) TO authenticated;

-- Buyer confirms receipt → release immediately
CREATE OR REPLACE FUNCTION public.confirm_order_received(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id = _order_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.order_items SET escrow_release_at = now()
    WHERE order_id = _order_id AND fulfillment_status = 'delivered' AND escrow_released = false;
  FOR s IN SELECT DISTINCT seller_id FROM public.order_items WHERE order_id = _order_id AND seller_id IS NOT NULL LOOP
    PERFORM public.release_seller_escrow(s);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.confirm_order_received(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_order_received(uuid) TO authenticated;

-- Notify buyer on dispatch / delivery
CREATE OR REPLACE FUNCTION public.notify_buyer_fulfillment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o record;
BEGIN
  IF NEW.fulfillment_status IS DISTINCT FROM OLD.fulfillment_status
     AND NEW.fulfillment_status IN ('shipped','delivered') THEN
    SELECT id, user_id, order_number INTO o FROM public.orders WHERE id = NEW.order_id;
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (o.user_id, 'order_' || NEW.fulfillment_status,
      CASE WHEN NEW.fulfillment_status = 'shipped' THEN 'Order #' || o.order_number || ' dispatched'
           ELSE 'Order #' || o.order_number || ' delivered' END,
      CASE WHEN NEW.fulfillment_status = 'shipped'
           THEN NEW.name || ' is on its way' || coalesce(' with ' || NEW.rider_name, '') || coalesce(' (' || NEW.rider_phone || ')', '') || '.'
           ELSE NEW.name || ' has been delivered. Tap to confirm receipt.' END,
      '/orders/' || o.id);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_buyer_fulfillment() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_notify_buyer_fulfillment AFTER UPDATE OF fulfillment_status ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.notify_buyer_fulfillment();

-- Notify on new chat message
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; v_to uuid;
BEGIN
  SELECT customer_id, seller_id INTO c FROM public.conversations WHERE id = NEW.conversation_id;
  v_to := CASE WHEN NEW.sender_id = c.customer_id THEN c.seller_id ELSE c.customer_id END;
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (v_to, 'message', 'New message', left(NEW.body, 120),
    CASE WHEN v_to = c.seller_id THEN '/seller/messages' ELSE '/messages' END);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_new_message() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_notify_new_message AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();
