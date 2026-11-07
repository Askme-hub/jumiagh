ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS refund_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS refund_note text,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by text;

CREATE OR REPLACE FUNCTION public.buyer_cancel_order(_order_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.orders%ROWTYPE; v_refund text := 'none';
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND OR o.user_id <> auth.uid() THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.status NOT IN ('pending_payment','placed','pending_confirmation') THEN
    RAISE EXCEPTION 'This order is already being prepared or shipped and can no longer be cancelled';
  END IF;
  IF EXISTS (SELECT 1 FROM public.order_items WHERE order_id = _order_id AND fulfillment_status IN ('shipped','delivered')) THEN
    RAISE EXCEPTION 'This order is already being prepared or shipped and can no longer be cancelled';
  END IF;
  IF o.payment_status = 'paid' AND o.payment_method <> 'cod' THEN v_refund := 'pending'; END IF;
  UPDATE public.orders SET status = 'cancelled', cancelled_at = now(), cancelled_by = 'buyer', refund_status = v_refund
    WHERE id = _order_id;
  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT DISTINCT seller_id, 'order', 'Order cancelled by buyer', 'Order #' || o.order_number || ' was cancelled. Please do not ship it.', '/seller/orders/' || _order_id
  FROM public.order_items WHERE order_id = _order_id AND seller_id IS NOT NULL;
  INSERT INTO public.inbox_messages (user_id, title, body) VALUES (o.user_id, 'Order cancelled',
    CASE WHEN v_refund = 'pending'
      THEN 'Order #' || o.order_number || ' was cancelled. Your refund of GH₵' || o.total || ' will be sent to your original payment account within 2 working business days.'
      ELSE 'Order #' || o.order_number || ' was cancelled.' END);
  RETURN v_refund;
END $$;
REVOKE EXECUTE ON FUNCTION public.buyer_cancel_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buyer_cancel_order(uuid) TO authenticated;