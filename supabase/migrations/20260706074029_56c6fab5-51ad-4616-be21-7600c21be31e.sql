ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS door_delivery_fee numeric NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS pickup_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pickup_station text,
  ADD COLUMN IF NOT EXISTS pickup_region text,
  ADD COLUMN IF NOT EXISTS pickup_fee numeric NOT NULL DEFAULT 10;