ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text, ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz, ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

CREATE OR REPLACE FUNCTION public.guard_profile_phone_verified() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    NEW.phone_verified_at := OLD.phone_verified_at;
    IF NEW.phone IS DISTINCT FROM OLD.phone THEN NEW.phone_verified_at := NULL; END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_profile_phone ON public.profiles;
CREATE TRIGGER trg_guard_profile_phone BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile_phone_verified();

CREATE OR REPLACE FUNCTION public.notify_chat_message() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; recipient uuid; sender_name text; link text;
BEGIN
  SELECT * INTO c FROM public.conversations WHERE id = NEW.conversation_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF NEW.sender_id = c.customer_id THEN
    recipient := c.seller_id; link := '/seller/messages?c=' || c.id;
  ELSE
    recipient := c.customer_id; link := '/messages?c=' || c.id;
  END IF;
  SELECT shop_name INTO sender_name FROM public.seller_profiles WHERE user_id = NEW.sender_id;
  IF sender_name IS NULL THEN SELECT display_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id; END IF;
  INSERT INTO public.notifications(user_id, type, title, body, link)
  VALUES (recipient, 'message', 'New message from ' || coalesce(sender_name, 'a Kivora user'), left(NEW.body, 120), link);
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_chat_message() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_notify_chat_message ON public.messages;
CREATE TRIGGER trg_notify_chat_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_chat_message();