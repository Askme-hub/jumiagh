CREATE TABLE public.pos_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  receipt_number text NOT NULL UNIQUE,
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  customer_name text,
  customer_phone text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pos_sales TO authenticated;
GRANT ALL ON public.pos_sales TO service_role;
ALTER TABLE public.pos_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers view own POS sales" ON public.pos_sales FOR SELECT TO authenticated
  USING (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX pos_sales_seller_idx ON public.pos_sales (seller_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.record_pos_sale(
  _items jsonb, _payment_method text, _discount numeric DEFAULT 0,
  _customer_name text DEFAULT NULL, _customer_phone text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _it jsonb; _p record; _qty int;
  _lines jsonb := '[]'::jsonb; _sub numeric := 0; _disc numeric;
  _id uuid; _rn text;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'seller') THEN RAISE EXCEPTION 'Only sellers can record sales'; END IF;
  IF _payment_method NOT IN ('cash','momo','card') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;
  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'Cart is empty'; END IF;
  FOR _it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _qty := (_it->>'qty')::int;
    IF _qty IS NULL OR _qty < 1 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
    SELECT id, name, price, stock INTO _p FROM public.products
      WHERE id = (_it->>'product_id')::uuid AND seller_id = _uid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product not in your shop'; END IF;
    IF _p.stock < _qty THEN RAISE EXCEPTION 'Not enough stock for %', _p.name; END IF;
    UPDATE public.products SET stock = stock - _qty WHERE id = _p.id;
    _sub := _sub + _p.price * _qty;
    _lines := _lines || jsonb_build_object('product_id', _p.id, 'name', _p.name, 'price', _p.price, 'qty', _qty);
  END LOOP;
  _disc := LEAST(GREATEST(COALESCE(_discount,0),0), _sub);
  _rn := 'POS-' || to_char(now(),'YYMMDD') || '-' || upper(substr(md5(random()::text),1,5));
  INSERT INTO public.pos_sales (seller_id, receipt_number, subtotal, discount, total, payment_method, customer_name, customer_phone, items)
  VALUES (_uid, _rn, _sub, _disc, _sub - _disc, _payment_method, NULLIF(trim(_customer_name),''), NULLIF(trim(_customer_phone),''), _lines)
  RETURNING id INTO _id;
  RETURN _id;
END $$;
REVOKE EXECUTE ON FUNCTION public.record_pos_sale(jsonb,text,numeric,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_pos_sale(jsonb,text,numeric,text,text) TO authenticated;