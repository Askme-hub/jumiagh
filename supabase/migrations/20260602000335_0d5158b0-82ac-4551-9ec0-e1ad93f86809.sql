-- 1. SETTINGS TABLE (marketplace-wide config)
CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.settings TO authenticated, anon;
GRANT ALL ON public.settings TO service_role;

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings public read" ON public.settings
FOR SELECT USING (true);

CREATE POLICY "settings admin write" ON public.settings
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.settings (key, value) VALUES ('commission_rate', '0.10'::jsonb);

-- 2. SELLER WALLETS
CREATE TABLE public.seller_wallets (
  user_id uuid PRIMARY KEY,
  balance numeric NOT NULL DEFAULT 0,
  pending numeric NOT NULL DEFAULT 0,
  total_earned numeric NOT NULL DEFAULT 0,
  total_withdrawn numeric NOT NULL DEFAULT 0,
  commission_paid numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_wallets TO authenticated;
GRANT ALL ON public.seller_wallets TO service_role;

ALTER TABLE public.seller_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallet seller read own" ON public.seller_wallets
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_seller_wallets_updated_at
BEFORE UPDATE ON public.seller_wallets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. TRANSACTIONS LEDGER
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  type text NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  order_id uuid,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_seller ON public.transactions(seller_id);

GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions seller read own" ON public.transactions
FOR SELECT TO authenticated
USING (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 4. WITHDRAWAL REQUESTS
CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  method text NOT NULL,
  account_details text,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_withdrawals_seller ON public.withdrawal_requests(seller_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "withdrawals seller read own" ON public.withdrawal_requests
FOR SELECT TO authenticated
USING (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "withdrawals seller insert own" ON public.withdrawal_requests
FOR INSERT TO authenticated
WITH CHECK (seller_id = auth.uid() AND public.has_role(auth.uid(), 'seller'));

CREATE POLICY "withdrawals admin update" ON public.withdrawal_requests
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_withdrawal_requests_updated_at
BEFORE UPDATE ON public.withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. EARNINGS TRIGGER: credit wallet when an order item is delivered
CREATE OR REPLACE FUNCTION public.credit_seller_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate numeric;
  v_gross numeric;
  v_commission numeric;
  v_net numeric;
BEGIN
  IF NEW.fulfillment_status = 'delivered'
     AND OLD.fulfillment_status IS DISTINCT FROM 'delivered'
     AND NEW.seller_id IS NOT NULL THEN

    SELECT COALESCE((value)::text::numeric, 0.10) INTO v_rate
    FROM public.settings WHERE key = 'commission_rate';
    IF v_rate IS NULL THEN v_rate := 0.10; END IF;

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
$$;

CREATE TRIGGER trg_credit_seller_on_delivery
AFTER UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.credit_seller_on_delivery();