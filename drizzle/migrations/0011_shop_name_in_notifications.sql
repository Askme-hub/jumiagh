CREATE OR REPLACE FUNCTION public.notify_new_message() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; v_to uuid; v_shop text; v_title text;
BEGIN
  SELECT customer_id, seller_id INTO c FROM public.conversations WHERE id = NEW.conversation_id;
  v_to := CASE WHEN NEW.sender_id = c.customer_id THEN c.seller_id ELSE c.customer_id END;
  SELECT shop_name INTO v_shop FROM public.seller_profiles WHERE user_id = c.seller_id;
  v_title := CASE WHEN v_to = c.customer_id THEN 'New message from ' || coalesce(v_shop, 'a seller')
                  ELSE 'New customer message' || coalesce(' · ' || v_shop, '') END;
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (v_to, 'message', v_title, left(NEW.body, 120),
    CASE WHEN v_to = c.seller_id THEN '/seller/messages' ELSE '/messages' END);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_buyer_fulfillment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o record; v_shop text;
BEGIN
  IF NEW.fulfillment_status IS DISTINCT FROM OLD.fulfillment_status
     AND NEW.fulfillment_status IN ('shipped','delivered') THEN
    SELECT id, user_id, order_number INTO o FROM public.orders WHERE id = NEW.order_id;
    SELECT shop_name INTO v_shop FROM public.seller_profiles WHERE user_id = NEW.seller_id;
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (o.user_id, 'order_' || NEW.fulfillment_status,
      CASE WHEN NEW.fulfillment_status = 'shipped' THEN 'Order #' || o.order_number || ' dispatched' || coalesce(' by ' || v_shop, '')
           ELSE 'Order #' || o.order_number || ' delivered' || coalesce(' from ' || v_shop, '') END,
      CASE WHEN NEW.fulfillment_status = 'shipped'
           THEN NEW.name || coalesce(' from ' || v_shop, '') || ' is on its way' || coalesce(' with ' || NEW.rider_name, '') || coalesce(' (' || NEW.rider_phone || ')', '') || '.'
           ELSE NEW.name || coalesce(' from ' || v_shop, '') || ' has been delivered. Tap to confirm receipt.' END,
      '/orders/' || o.id);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_new_order_item() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_shop text;
BEGIN
  IF NEW.seller_id IS NOT NULL THEN
    SELECT shop_name INTO v_shop FROM public.seller_profiles WHERE user_id = NEW.seller_id;
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (NEW.seller_id, 'new_order', coalesce(v_shop || ': ', '') || 'New order — ' || NEW.name,
      NEW.qty || ' unit(s) ordered from ' || coalesce(v_shop, 'your shop') || '. Check your orders to fulfill it.', '/seller/orders');
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.notify_new_message(), public.notify_buyer_fulfillment(), public.notify_new_order_item() FROM PUBLIC, anon, authenticated;