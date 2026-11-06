CREATE TABLE public.phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX phone_verifications_user_phone_idx ON public.phone_verifications(user_id, phone, created_at DESC);
GRANT ALL ON public.phone_verifications TO service_role;
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.escrow_on_delivery()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_rate numeric; v_gross numeric; v_commission numeric; v_net numeric; v_method text;
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
    SELECT payment_method INTO v_method FROM public.orders WHERE id = NEW.order_id;

    IF v_method = 'cod' THEN
      -- Seller collected cash directly; charge commission against wallet (may go negative).
      NEW.seller_net := 0;
      NEW.escrow_released := true;
      INSERT INTO public.seller_wallets (user_id, balance, commission_paid)
      VALUES (NEW.seller_id, -v_commission, v_commission)
      ON CONFLICT (user_id) DO UPDATE SET
        balance = public.seller_wallets.balance - v_commission,
        commission_paid = public.seller_wallets.commission_paid + v_commission,
        updated_at = now();
      INSERT INTO public.transactions (seller_id, type, amount, order_id, description)
      VALUES (NEW.seller_id, 'cod_commission', -v_commission, NEW.order_id, 'COD commission owed on: ' || NEW.name);
      RETURN NEW;
    END IF;

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
END $function$;