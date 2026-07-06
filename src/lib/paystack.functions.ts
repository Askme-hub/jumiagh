import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
  shipping_fee: z.number().min(0).max(10000),
  discount: z.number().min(0).max(10000),
});

export const initiatePaystackCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      items: z.array(ItemSchema).min(1).max(100),
      callbackOrigin: z.string().url(),
      delivery: DeliverySchema,
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("Paystack not configured");

    // server-side total (don't trust client)
    const itemsTotal = data.items.reduce((a, i) => a + i.price * i.qty, 0);
    const itemCount = data.items.reduce((a, i) => a + i.qty, 0);

    // Delivery fee comes from the sellers' store settings
    const productIds = data.items.map((i) => i.product_id).filter(Boolean) as string[];
    let shipping = data.delivery.delivery_type === "pickup" ? 10 : (itemsTotal >= 150 ? 0 : 25);
    if (productIds.length > 0) {
      const { data: prods } = await supabaseAdmin
        .from("products")
        .select("seller_id")
        .in("id", productIds);
      const sellerIds = [...new Set((prods ?? []).map((p) => p.seller_id).filter(Boolean))] as string[];
      if (sellerIds.length > 0) {
        const { data: sellers } = await supabaseAdmin
          .from("seller_profiles")
          .select("door_delivery_fee, pickup_enabled, pickup_fee")
          .in("user_id", sellerIds);
        if (sellers && sellers.length > 0) {
          if (data.delivery.delivery_type === "pickup") {
            const p = sellers.filter((s: any) => s.pickup_enabled).reduce((a: number, s: any) => a + Number(s.pickup_fee ?? 10), 0);
            shipping = p > 0 ? p : 10;
          } else {
            shipping = sellers.reduce((a: number, s: any) => a + Number(s.door_delivery_fee ?? 25), 0);
          }
        }
      }
    }
    const discount = 0;
    const total = Math.max(0, itemsTotal + shipping - discount);
    if (total <= 0) throw new Error("Invalid cart total");

    // fetch user email
    const { data: profile } = await supabaseAdmin
      .from("profiles").select("email").eq("id", userId).maybeSingle();
    const email = profile?.email ?? `${userId}@user.local`;

    // create order
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        total,
        item_count: itemCount,
        status: "pending_payment",
        payment_status: "pending",
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

    // insert items
    const { error: ie } = await supabaseAdmin.from("order_items").insert(
      data.items.map((i) => ({ ...i, order_id: order.id }))
    );
    if (ie) {
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      throw new Error(ie.message);
    }

    // init paystack
    const reference = `JM_${order.id.replace(/-/g, "").slice(0, 16)}_${Date.now()}`;
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: Math.round(total * 100), // pesewas
        currency: "GHS",
        reference,
        callback_url: `${data.callbackOrigin}/payment/callback?ref=${reference}`,
        metadata: { order_id: order.id, user_id: userId, order_number: order.order_number },
      }),
    });
    const json: any = await res.json();
    if (!res.ok || !json.status) {
      await supabaseAdmin.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
      throw new Error(json.message ?? "Paystack init failed");
    }

    await supabaseAdmin
      .from("orders")
      .update({
        payment_reference: reference,
        paystack_access_code: json.data.access_code,
      })
      .eq("id", order.id);

    return {
      authorization_url: json.data.authorization_url as string,
      reference,
      order_id: order.id,
    };
  });

export const verifyPaystackPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reference: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("Paystack not configured");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("payment_reference", data.reference)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!order) throw new Error("Order not found");

    if (order.payment_status === "paid") {
      return { status: "paid", order_id: order.id };
    }

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const json: any = await res.json();
    if (!res.ok || !json.status) throw new Error(json.message ?? "Verify failed");

    const tx = json.data;
    const success = tx.status === "success" && Math.round(Number(order.total) * 100) === tx.amount;

    if (success) {
      await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "paid",
          amount_paid: tx.amount / 100,
          status: "placed",
        })
        .eq("id", order.id);

      // Notify the buyer in their inbox (once)
      const orderRef = order.order_number ?? order.id.slice(0, 8);
      const { data: existingMsg } = await supabaseAdmin
        .from("inbox_messages")
        .select("id")
        .eq("user_id", order.user_id)
        .eq("title", `Order #${orderRef} placed`)
        .maybeSingle();
      if (!existingMsg) {
        await supabaseAdmin.from("inbox_messages").insert({
          user_id: order.user_id,
          title: `Order #${orderRef} placed`,
          body: `Thank you! Your order of ${order.item_count} item(s) totalling GH₵ ${Number(order.total).toFixed(2)} has been received and is being processed. We'll keep you updated on delivery.`,
        });
      }

      // SMS notifications (best-effort, never block the response)
      const { trySendSMS, normalizeGhanaPhone } = await import("./sms.server");
      if (order.delivery_phone) {
        await trySendSMS(
          order.delivery_phone,
          `Kivora: Order #${orderRef} confirmed. ${order.item_count} item(s), GH₵ ${Number(order.total).toFixed(2)}. We'll notify you as it ships. Thank you!`
        );
      }
      // Alert each seller in the order
      const { data: soldItems } = await supabaseAdmin
        .from("order_items")
        .select("seller_id, name")
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
              `Kivora: You have a new paid order (#${orderRef}). Log in to your Seller Hub to fulfil it.`
            );
          }
          if (sp.user_id) {
            await supabaseAdmin.from("inbox_messages").insert({
              user_id: sp.user_id,
              title: `New order #${orderRef}`,
              body: `You have a new paid order. Head to your Seller Hub → Orders to process it.`,
            });
          }
        }
      }

      return { status: "paid", order_id: order.id };
    }

    await supabaseAdmin
      .from("orders")
      .update({ payment_status: "failed" })
      .eq("id", order.id);
    return { status: "failed", order_id: order.id };
  });
