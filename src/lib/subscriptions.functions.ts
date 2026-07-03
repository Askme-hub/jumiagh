import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PLAN_PRICES: Record<string, number> = { starter: 199, premium: 500 };

export const initiateSubscriptionCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        plan: z.enum(["starter", "premium"]),
        callbackOrigin: z.string().url(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("Payments not configured");

    const amount = PLAN_PRICES[data.plan];
    if (!amount) throw new Error("Invalid plan");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    const email = profile?.email ?? `${userId}@user.local`;

    const reference = `SUB_${data.plan}_${userId.replace(/-/g, "").slice(0, 12)}_${Date.now()}`;
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100),
        currency: "GHS",
        reference,
        callback_url: `${data.callbackOrigin}/subscription/callback?ref=${reference}`,
        metadata: { type: "subscription", plan: data.plan, user_id: userId },
      }),
    });
    const json: any = await res.json();
    if (!res.ok || !json.status) throw new Error(json.message ?? "Payment init failed");

    return {
      authorization_url: json.data.authorization_url as string,
      reference,
    };
  });

export const verifySubscriptionPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ reference: z.string().min(1).max(200) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("Payments not configured");

    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`,
      { headers: { Authorization: `Bearer ${secret}` } }
    );
    const json: any = await res.json();
    if (!res.ok || !json.status) throw new Error(json.message ?? "Verification failed");

    const tx = json.data;
    const meta = tx.metadata ?? {};
    const plan = meta.plan as "starter" | "premium" | undefined;

    // Only the paying seller can activate their own subscription
    if (meta.user_id !== context.userId) throw new Error("Subscription mismatch");
    if (tx.status !== "success" || !plan) return { status: "failed" as const, plan: null };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { error } = await supabaseAdmin
      .from("seller_subscriptions")
      .upsert(
        {
          user_id: context.userId,
          plan,
          status: "active",
          started_at: now.toISOString(),
          expires_at: expires.toISOString(),
          payment_reference: data.reference,
        },
        { onConflict: "user_id" }
      );
    if (error) throw new Error(error.message);

    // Confirmation SMS + inbox (best-effort)
    const { trySendSMS } = await import("./sms.server");
    const { data: sp } = await supabaseAdmin
      .from("seller_profiles")
      .select("phone, shop_name")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (sp?.phone) {
      await trySendSMS(
        sp.phone,
        `Kivora: Your ${plan.toUpperCase()} plan is now active until ${expires.toDateString()}. Enjoy lower commissions and more selling power!`
      );
    }
    await supabaseAdmin.from("inbox_messages").insert({
      user_id: context.userId,
      title: `${plan[0].toUpperCase()}${plan.slice(1)} plan activated`,
      body: `Your Kivora ${plan} subscription is active until ${expires.toDateString()}. Thank you for upgrading!`,
    });

    return { status: "paid" as const, plan };
  });
