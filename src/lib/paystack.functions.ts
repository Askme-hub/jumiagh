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

export const initiatePaystackCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      items: z.array(ItemSchema).min(1).max(100),
      callbackOrigin: z.string().url(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("Paystack not configured");

    // server-side total (don't trust client)
    const total = data.items.reduce((a, i) => a + i.price * i.qty, 0);
    const itemCount = data.items.reduce((a, i) => a + i.qty, 0);
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
      return { status: "paid", order_id: order.id };
    }

    await supabaseAdmin
      .from("orders")
      .update({ payment_status: "failed" })
      .eq("id", order.id);
    return { status: "failed", order_id: order.id };
  });
