
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_type text NOT NULL DEFAULT 'door',
  ADD COLUMN IF NOT EXISTS pickup_station text,
  ADD COLUMN IF NOT EXISTS shipping_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0;
