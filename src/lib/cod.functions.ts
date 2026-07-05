import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ItemSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(500),
  price: z.number().min(0),
  old_price: z.number().nullable().optional(),
  image_url: z.string().max(2000).nullable().optional(),
  qty: z.number().int().min(1).max(99),
});

const DeliverySchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(7).max(20).regex(/^[0-9+\-\s()]+$/),
  region: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().min(5).max(500),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  delivery_type: z.enum(["door", "pickup"]).default("door"),
  pickup_station: z.string().trim().max(200).optional().or(z.literal("")),
});

/**
 * Place a Pay-on-Delivery order. No online payment is taken now — the buyer
 * pays cash/MoMo to the courier when the product is delivered. The seller is
 * credited by the existing delivery trigger once the item is marked delivered.
 */
export const placeCODOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        items: z.array(ItemSchema).min(1).max(100),
        delivery: DeliverySchema,
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Server-side totals (never trust the client)
    const itemsTotal = data.items.reduce((a, i) => a + i.price * i.qty, 0);
    const itemCount = data.items.reduce((a, i) => a + i.qty, 0);
    const shipping = data.delivery.delivery_type === "pickup" ? 10 : itemsTotal >= 150 ? 0 : 25;
    const discount = data.delivery.delivery_type === "pickup" && itemsTotal >= 150 ? 10 : 0;
    const total = Math.max(0, itemsTotal + shipping - discount);
    if (total <= 0) throw new Error("Invalid cart total");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        total,
        item_count: itemCount,
        status: "placed",
        payment_status: "pending",
        payment_method: "cod",
        delivery_name: data.delivery.name,
        delivery_phone: data.delivery.phone,
        delivery_region: data.delivery.region,
        delivery_city: data.delivery.city,
        delivery_address: data.delivery.address,
        delivery_notes: data.delivery.notes || null,
        delivery_type: data.delivery.delivery_type,
        pickup_station: data.delivery.pickup_station || null,
        shipping_fee: shipping,
        discount,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const { error: ie } = await supabaseAdmin
      .from("order_items")
      .insert(data.items.map((i) => ({ ...i, order_id: order.id })));
    if (ie) {
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      throw new Error(ie.message);
    }

    const orderRef = order.order_number ?? order.id.slice(0, 8);

    // Buyer inbox confirmation
    await supabaseAdmin.from("inbox_messages").insert({
      user_id: order.user_id,
      title: `Order #${orderRef} placed`,
      body: `Thank you! Your Pay on Delivery order of ${order.item_count} item(s) totalling GH₵ ${Number(order.total).toFixed(2)} has been received. Please have the amount ready to pay the courier on delivery.`,
    });

    // SMS notifications (best-effort, never block)
    const { trySendSMS, normalizeGhanaPhone } = await import("./sms.server");
    if (order.delivery_phone) {
      await trySendSMS(
        order.delivery_phone,
        `Kivora: Order #${orderRef} placed (Pay on Delivery). ${order.item_count} item(s), GH₵ ${Number(order.total).toFixed(2)}. Pay the courier on delivery. Thank you!`
      );
    }

    // Alert each seller in the order
    const { data: soldItems } = await supabaseAdmin
      .from("order_items")
      .select("seller_id")
      .eq("order_id", order.id);
    const sellerIds = [
      ...new Set((soldItems ?? []).map((i) => i.seller_id).filter(Boolean)),
    ] as string[];
    if (sellerIds.length > 0) {
      const { data: sellerProfiles } = await supabaseAdmin
        .from("seller_profiles")
        .select("user_id, phone")
        .in("user_id", sellerIds);
      for (const sp of sellerProfiles ?? []) {
        if (sp.phone && normalizeGhanaPhone(sp.phone)) {
          await trySendSMS(
            sp.phone,
            `Kivora: New Pay on Delivery order (#${orderRef}). Log in to your Seller Hub to fulfil it.`
          );
        }
        if (sp.user_id) {
          await supabaseAdmin.from("inbox_messages").insert({
            user_id: sp.user_id,
            title: `New order #${orderRef}`,
            body: `You have a new Pay on Delivery order. Head to your Seller Hub → Orders to process it.`,
          });
        }
      }
    }

    return { order_id: order.id, order_number: orderRef };
  });
