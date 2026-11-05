CREATE TABLE public.subscription_plans (
  id public.subscription_plan PRIMARY KEY,
  name text NOT NULL,
  tagline text,
  price numeric NOT NULL DEFAULT 0 CHECK (price >= 0),
  commission numeric NOT NULL CHECK (commission >= 0 AND commission <= 100),
  product_limit integer CHECK (product_limit IS NULL OR product_limit >= 0),
  featured_slots integer NOT NULL DEFAULT 0,
  features text[] NOT NULL DEFAULT '{}',
  highlight boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT INSERT, UPDATE ON public.subscription_plans TO authenticated;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans public read" ON public.subscription_plans FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage plans" ON public.subscription_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.subscription_plans (id, name, tagline, price, commission, product_limit, featured_slots, features, highlight, sort_order) VALUES
('free','Free','Start selling at no cost',0,12,10,0,ARRAY['Standard storefront listing','Basic sales dashboard'],false,0),
('starter','Starter','For growing shops',199,8,100,1,ARRAY['SMS order & payout alerts','Priority in search results'],true,1),
('premium','Premium','For serious brands',500,5,NULL,5,ARRAY['SMS marketing campaigns','Advanced analytics','Priority seller support'],false,2);

CREATE TABLE public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan public.subscription_plan NOT NULL,
  amount numeric NOT NULL,
  reference text NOT NULL UNIQUE,
  period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.subscription_payments (user_id, created_at DESC);
GRANT SELECT ON public.subscription_payments TO authenticated;
GRANT ALL ON public.subscription_payments TO service_role;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or admin read payments" ON public.subscription_payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.credit_seller_on_delivery()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_rate numeric; v_gross numeric; v_commission numeric; v_net numeric;
BEGIN
  IF NEW.fulfillment_status = 'delivered'
     AND OLD.fulfillment_status IS DISTINCT FROM 'delivered'
     AND NEW.seller_id IS NOT NULL THEN
    SELECT commission / 100.0 INTO v_rate FROM public.subscription_plans
      WHERE id = public.active_seller_plan(NEW.seller_id);
    v_rate := coalesce(v_rate, 0.12);
    v_gross := NEW.price * NEW.qty;
    v_commission := round(v_gross * v_rate, 2);
    v_net := v_gross - v_commission;
    INSERT INTO public.seller_wallets (user_id, balance, total_earned, commission_paid)
    VALUES (NEW.seller_id, v_net, v_net, v_commission)
    ON CONFLICT (user_id) DO UPDATE SET
      balance = public.seller_wallets.balance + v_net,
      total_earned = public.seller_wallets.total_earned + v_net,
      commission_paid = public.seller_wallets.commission_paid + v_commission,
      updated_at = now();
    INSERT INTO public.transactions (seller_id, type, amount, order_id, description)
    VALUES (NEW.seller_id, 'earning', v_net, NEW.order_id, 'Sale: ' || NEW.name);
    INSERT INTO public.transactions (seller_id, type, amount, order_id, description)
    VALUES (NEW.seller_id, 'commission', -v_commission, NEW.order_id, 'Commission on: ' || NEW.name);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_product_limit()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_limit integer; v_count integer; v_name text;
BEGIN
  IF NEW.seller_id IS NULL OR public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  SELECT product_limit, name INTO v_limit, v_name FROM public.subscription_plans
    WHERE id = public.active_seller_plan(NEW.seller_id);
  IF v_limit IS NULL THEN RETURN NEW; END IF;
  SELECT count(*) INTO v_count FROM public.products WHERE seller_id = NEW.seller_id;
  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Your % plan allows up to % products. Upgrade your plan to add more.', v_name, v_limit;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.enforce_product_limit() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_enforce_product_limit BEFORE INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_product_limit();