
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_reference text UNIQUE,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS paystack_access_code text,
  ADD COLUMN IF NOT EXISTS amount_paid numeric;

CREATE INDEX IF NOT EXISTS orders_payment_reference_idx ON public.orders(payment_reference);
