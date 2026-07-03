create type public.subscription_plan as enum ('free','starter','premium');

create table public.seller_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan public.subscription_plan not null default 'free',
  status text not null default 'active',
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

grant select on public.seller_subscriptions to authenticated;
grant all on public.seller_subscriptions to service_role;

alter table public.seller_subscriptions enable row level security;

create policy "Sellers view own subscription"
  on public.seller_subscriptions for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

create policy "Admins manage subscriptions"
  on public.seller_subscriptions for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

create trigger trg_seller_sub_updated
  before update on public.seller_subscriptions
  for each row execute function public.update_updated_at_column();

create or replace function public.active_seller_plan(_user_id uuid)
returns public.subscription_plan
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select plan from public.seller_subscriptions
      where user_id = _user_id and status = 'active'
        and (expires_at is null or expires_at > now())
      order by plan desc
      limit 1), 'free'::public.subscription_plan)
$$;

revoke execute on function public.active_seller_plan(uuid) from public, anon;
grant execute on function public.active_seller_plan(uuid) to authenticated, service_role;

create or replace function public.credit_seller_on_delivery()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
DECLARE
  v_rate numeric;
  v_gross numeric;
  v_commission numeric;
  v_net numeric;
BEGIN
  IF NEW.fulfillment_status = 'delivered'
     AND OLD.fulfillment_status IS DISTINCT FROM 'delivered'
     AND NEW.seller_id IS NOT NULL THEN

    v_rate := CASE public.active_seller_plan(NEW.seller_id)
      WHEN 'premium' THEN 0.05
      WHEN 'starter' THEN 0.08
      ELSE 0.12
    END;

    v_gross := NEW.price * NEW.qty;
    v_commission := round(v_gross * v_rate, 2);
    v_net := v_gross - v_commission;

    INSERT INTO public.seller_wallets (user_id, balance, total_earned, commission_paid)
    VALUES (NEW.seller_id, v_net, v_net, v_commission)
    ON CONFLICT (user_id) DO UPDATE SET
      balance = public.seller_wallets.balance + v_net,
      total_earned = public.seller_wallets.total_earned + v_net,
      commission_paid = public.seller_wallets.commission_paid + v_commission,
      updated_at = now();

    INSERT INTO public.transactions (seller_id, type, amount, order_id, description)
    VALUES (NEW.seller_id, 'earning', v_net, NEW.order_id, 'Sale: ' || NEW.name);

    INSERT INTO public.transactions (seller_id, type, amount, order_id, description)
    VALUES (NEW.seller_id, 'commission', -v_commission, NEW.order_id, 'Commission on: ' || NEW.name);
  END IF;
  RETURN NEW;
END;
$function$;