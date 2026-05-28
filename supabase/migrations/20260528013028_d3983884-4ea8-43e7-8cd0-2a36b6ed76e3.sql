
-- seller_profiles table
CREATE TABLE public.seller_profiles (
  user_id uuid PRIMARY KEY,
  shop_name text NOT NULL,
  bio text,
  logo_url text,
  phone text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.seller_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_profiles TO authenticated;
GRANT ALL ON public.seller_profiles TO service_role;

ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seller_profiles public read approved"
  ON public.seller_profiles FOR SELECT
  USING (status = 'approved' OR user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "seller_profiles self insert"
  ON public.seller_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "seller_profiles self update"
  ON public.seller_profiles FOR UPDATE
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "seller_profiles admin delete"
  ON public.seller_profiles FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_seller_profiles_updated_at
BEFORE UPDATE ON public.seller_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS seller_id uuid,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';

CREATE INDEX IF NOT EXISTS products_seller_id_idx ON public.products(seller_id);

DROP POLICY IF EXISTS "products read all" ON public.products;

CREATE POLICY "products public read approved"
  ON public.products FOR SELECT
  USING (approval_status = 'approved' OR seller_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "products seller insert own"
  ON public.products FOR INSERT
  WITH CHECK (seller_id = auth.uid() AND has_role(auth.uid(), 'seller'));

CREATE POLICY "products seller update own"
  ON public.products FOR UPDATE
  USING (seller_id = auth.uid() AND has_role(auth.uid(), 'seller'));

CREATE POLICY "products seller delete own"
  ON public.products FOR DELETE
  USING (seller_id = auth.uid() AND has_role(auth.uid(), 'seller'));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "product-images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "product-images authenticated upload own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "product-images update own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'product-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "product-images delete own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
