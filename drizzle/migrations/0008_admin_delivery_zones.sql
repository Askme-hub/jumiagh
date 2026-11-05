CREATE TABLE public.delivery_zones (
  id text PRIMARY KEY,
  label text NOT NULL,
  fee numeric NOT NULL DEFAULT 0 CHECK (fee >= 0),
  eta text NOT NULL DEFAULT '',
  regions text[] NOT NULL DEFAULT '{}',
  sort int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_zones TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.delivery_zones TO authenticated;
GRANT ALL ON public.delivery_zones TO service_role;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads delivery zones" ON public.delivery_zones FOR SELECT USING (true);
CREATE POLICY "Admins manage delivery zones" ON public.delivery_zones FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.delivery_zones (id, label, fee, eta, regions, sort) VALUES
 ('accra','Greater Accra',25,'1–2 days','{"Greater Accra"}',1),
 ('south','Kumasi & southern belt',35,'2–3 days','{"Ashanti","Central","Eastern"}',2),
 ('regional','Other regional capitals',45,'3–4 days','{"Western","Volta","Bono","Northern"}',3),
 ('remote','Rest of Ghana',55,'4–5 days','{}',4);