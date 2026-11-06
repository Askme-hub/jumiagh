// Server-only: marks a Paystack order as paid and sends buyer/seller alerts exactly once.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function finalizePaidOrder(orderId: string, amountPaid: number): Promise<boolean> {
  // Atomic claim: only the first caller (webhook or browser callback) flips the status and notifies.
  const { data: claimed } = await supabaseAdmin
    .from("orders")
    .update({ payment_status: "paid", amount_paid: amountPaid, status: "placed" })
    .eq("id", orderId)
    .neq("payment_status", "paid")
    .select("*");
  const order: any = claimed?.[0];
  if (!order) return false;

  try {
    if (order.coupon_code) {
      const { redeemCoupon } = await import("./coupons.functions");
      await redeemCoupon(order.coupon_code);
    }
  } catch (e) { console.warn("coupon redeem failed", e); }

  const orderRef = order.order_number ?? order.id.slice(0, 8);
  const { data: existingMsg } = await supabaseAdmin
    .from("inbox_messages").select("id")
    .eq("user_id", order.user_id).eq("title", `Order #${orderRef} placed`).maybeSingle();
  if (!existingMsg) {
    await supabaseAdmin.from("inbox_messages").insert({
      user_id: order.user_id,
      title: `Order #${orderRef} placed`,
      body: `Thank you! Your order of ${order.item_count} item(s) totalling GH₵ ${Number(order.total).toFixed(2)} has been received and is being processed. We'll keep you updated on delivery.`,
    });
  }

  const { trySendSMS, normalizeGhanaPhone } = await import("./sms.server");
  const { data: items } = await supabaseAdmin
    .from("order_items").select("name, qty, seller_id").eq("order_id", order.id);
  const itemLines = (items ?? []).map((i: any) => `${i.qty} x ${String(i.name).slice(0, 40)}`).join(", ");
  const dest = order.delivery_type === "pickup"
    ? `Pickup: ${order.pickup_station ?? "station"}`
    : `Delivery: ${[order.delivery_address, order.delivery_city, order.delivery_region].filter(Boolean).join(", ")}`;
  const sellerIds = [...new Set((items ?? []).map((i: any) => i.seller_id).filter(Boolean))] as string[];
  const { data: sellers } = sellerIds.length
    ? await supabaseAdmin.from("seller_profiles").select("user_id, phone, shop_name").in("user_id", sellerIds)
    : { data: [] as any[] };
  const shopNames = (sellers ?? []).map((s: any) => s.shop_name).filter(Boolean).join(", ");
  const C = "GH\u20B5";

  if (order.delivery_phone) {
    await trySendSMS(
      order.delivery_phone,
      `KIVORA GH\nOrder #${orderRef} CONFIRMED (Paid Online)${shopNames ? ` from ${shopNames}` : ""}.\nItems: ${itemLines || `${order.item_count} item(s)`}\nSubtotal: ${C} ${(Number(order.total) - Number(order.shipping_fee ?? 0)).toFixed(2)}\nShipping: ${C} ${Number(order.shipping_fee ?? 0).toFixed(2)}\nTotal paid: ${C} ${Number(order.total).toFixed(2)}\n${dest}\nTrack your order in the Kivora app. Support: 0257573471`
    );
  }

  for (const sp of sellers ?? []) {
    if (sp.phone && normalizeGhanaPhone(sp.phone)) {
      await trySendSMS(
        sp.phone,
        `KIVORA GH - ${sp.shop_name}\nNew PAID order #${orderRef}.\nItems: ${itemLines || `${order.item_count} item(s)`}\nBuyer: ${order.delivery_name ?? ""} (${order.delivery_phone ?? "n/a"})\n${dest}\nLog in to your Seller Hub to process and ship it.`
      );
    }
    if (sp.user_id) {
      await supabaseAdmin.from("inbox_messages").insert({
        user_id: sp.user_id,
        title: `${sp.shop_name}: new order #${orderRef}`,
        body: `You have a new paid order. Head to your Seller Hub → Orders to process it.`,
      });
    }
  }

  try {
    const { flushPushNotifications } = await import("./push.server");
    await flushPushNotifications();
  } catch (e) { console.warn("push flush failed", e); }
  return true;
}
