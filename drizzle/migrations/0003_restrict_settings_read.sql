DROP POLICY IF EXISTS "settings authenticated read" ON public.settings;
REVOKE SELECT ON public.settings FROM anon;