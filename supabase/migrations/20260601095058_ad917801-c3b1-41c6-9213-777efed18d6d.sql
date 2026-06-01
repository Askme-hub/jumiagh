-- Add seller + fulfillment tracking to order line items
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS seller_id uuid,
  ADD COLUMN IF NOT EXISTS fulfillment_status text NOT NULL DEFAULT 'processing';

-- Backfill seller_id from products
UPDATE public.order_items oi
SET seller_id = p.seller_id
FROM public.products p
WHERE oi.product_id = p.id AND oi.seller_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_seller_id ON public.order_items(seller_id);

-- Trigger to auto-populate seller_id from the product on insert
CREATE OR REPLACE FUNCTION public.set_order_item_seller()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.seller_id IS NULL AND NEW.product_id IS NOT NULL THEN
    SELECT seller_id INTO NEW.seller_id FROM public.products WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_order_item_seller ON public.order_items;
CREATE TRIGGER trg_set_order_item_seller
BEFORE INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.set_order_item_seller();

-- Security-definer helper: does this order contain any item from this seller?
CREATE OR REPLACE FUNCTION public.is_order_seller(_order_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.order_items oi
    WHERE oi.order_id = _order_id AND oi.seller_id = _user_id
  )
$$;

-- order_items: sellers can read their own items
CREATE POLICY "order_items seller read own"
ON public.order_items
FOR SELECT
USING (seller_id = auth.uid());

-- order_items: sellers can update fulfillment of their own items
CREATE POLICY "order_items seller update own"
ON public.order_items
FOR UPDATE
USING (seller_id = auth.uid() AND has_role(auth.uid(), 'seller'::app_role))
WITH CHECK (seller_id = auth.uid() AND has_role(auth.uid(), 'seller'::app_role));

-- orders: sellers can read orders that contain their items
CREATE POLICY "orders seller read"
ON public.orders
FOR SELECT
USING (public.is_order_seller(id, auth.uid()));

-- order_status_history: sellers can read history of their orders
CREATE POLICY "status_history seller read"
ON public.order_status_history
FOR SELECT
USING (public.is_order_seller(order_id, auth.uid()));