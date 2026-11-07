ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS store_region text;
UPDATE public.seller_profiles SET store_region = COALESCE(pickup_region, 'Greater Accra') WHERE store_region IS NULL;