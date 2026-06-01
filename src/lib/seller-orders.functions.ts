import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type SellerOrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
  image_url: string | null;
  fulfillment_status: string;
};

export type SellerOrder = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  created_at: string;
  delivery_name: string | null;
  delivery_phone: string | null;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_region: string | null;
  delivery_type: string;
  pickup_station: string | null;
  delivery_notes: string | null;
  customer_email: string | null;
  customer_name: string | null;
  items: SellerOrderItem[];
  subtotal: number;
};

async function buildSellerOrders(userId: string, supabase: any, orderFilter?: string): Promise<SellerOrder[]> {
  // confirm seller role
  const { data: roleRow } = await supabase
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "seller").maybeSingle();
  if (!roleRow) return [];

  let itemsQ = supabase.from("order_items").select("*").eq("seller_id", userId);
  if (orderFilter) itemsQ = itemsQ.eq("order_id", orderFilter);
  const { data: items } = await itemsQ;
  if (!items || items.length === 0) return [];

  const orderIds = [...new Set(items.map((i: any) => i.order_id))] as string[];
  const { data: orders } = await supabase
    .from("orders").select("*").in("id", orderIds).order("created_at", { ascending: false });
  if (!orders) return [];

  const userIds = [...new Set(orders.map((o: any) => o.user_id))] as string[];
  const { data: profiles } = await supabaseAdmin
    .from("profiles").select("id, email, display_name").in("id", userIds);
  const pmap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  return orders.map((o: any) => {
    const myItems = items.filter((i: any) => i.order_id === o.id);
    const prof: any = pmap.get(o.user_id);
    return {
      id: o.id,
      order_number: o.order_number,
      status: o.status,
      payment_status: o.payment_status,
      created_at: o.created_at,
      delivery_name: o.delivery_name,
      delivery_phone: o.delivery_phone,
      delivery_address: o.delivery_address,
      delivery_city: o.delivery_city,
      delivery_region: o.delivery_region,
      delivery_type: o.delivery_type,
      pickup_station: o.pickup_station,
      delivery_notes: o.delivery_notes,
      customer_email: prof?.email ?? null,
      customer_name: prof?.display_name ?? o.delivery_name ?? null,
      items: myItems.map((i: any) => ({
        id: i.id,
        name: i.name,
        qty: i.qty,
        price: Number(i.price),
        image_url: i.image_url,
        fulfillment_status: i.fulfillment_status,
      })),
      subtotal: myItems.reduce((a: number, i: any) => a + Number(i.price) * i.qty, 0),
    };
  });
}

export const getSellerOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return buildSellerOrders(context.userId, context.supabase);
  });

export const getSellerOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const list = await buildSellerOrders(context.userId, context.supabase, data.orderId);
    return list[0] ?? null;
  });

export const updateItemFulfillment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      itemIds: z.array(z.string().uuid()).min(1).max(100),
      status: z.enum(["processing", "shipped", "delivered"]),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("order_items")
      .update({ fulfillment_status: data.status })
      .in("id", data.itemIds)
      .eq("seller_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
