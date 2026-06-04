CREATE TABLE public.payout_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method text NOT NULL,
  account_name text NOT NULL,
  account_number text NOT NULL,
  provider text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payout_accounts TO authenticated;
GRANT ALL ON public.payout_accounts TO service_role;

ALTER TABLE public.payout_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payout owner select" ON public.payout_accounts
  FOR SELECT TO authenticated
  USING (seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "payout owner insert" ON public.payout_accounts
  FOR INSERT TO authenticated
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "payout owner update" ON public.payout_accounts
  FOR UPDATE TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "payout owner delete" ON public.payout_accounts
  FOR DELETE TO authenticated
  USING (seller_id = auth.uid());

CREATE TRIGGER update_payout_accounts_updated_at
  BEFORE UPDATE ON public.payout_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();