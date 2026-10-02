CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, seller_id, order_id, product_id)
);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read conversations" ON public.conversations FOR SELECT TO authenticated USING (auth.uid() = customer_id OR auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "customer creates conversation" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "participants update conversation" ON public.conversations FOR UPDATE TO authenticated USING (auth.uid() = customer_id OR auth.uid() = seller_id) WITH CHECK (auth.uid() = customer_id OR auth.uid() = seller_id);

CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read messages" ON public.messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.customer_id = auth.uid() OR c.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "participants send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.customer_id = auth.uid() OR c.seller_id = auth.uid())));
CREATE POLICY "recipient marks read" ON public.messages FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.customer_id = auth.uid() OR c.seller_id = auth.uid())) AND sender_id <> auth.uid()) WITH CHECK (sender_id <> auth.uid());

CREATE OR REPLACE FUNCTION public.touch_conversation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN UPDATE public.conversations SET last_message_at = now() WHERE id = NEW.conversation_id; RETURN NEW; END; $$;
REVOKE EXECUTE ON FUNCTION public.touch_conversation() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_touch_conversation AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.touch_conversation();

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;