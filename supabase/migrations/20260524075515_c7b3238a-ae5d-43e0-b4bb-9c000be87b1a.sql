
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text,
  full_name text NOT NULL,
  phone text NOT NULL,
  region text NOT NULL,
  city text NOT NULL,
  address text NOT NULL,
  notes text,
  delivery_type text NOT NULL DEFAULT 'door',
  pickup_station text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "addresses self read" ON public.addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "addresses self insert" ON public.addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "addresses self update" ON public.addresses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "addresses self delete" ON public.addresses FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_addresses_user ON public.addresses(user_id);

CREATE TRIGGER update_addresses_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
