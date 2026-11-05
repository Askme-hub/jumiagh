import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Called by the browser after actions that create notifications (e.g. sending a chat message). */
export const flushMyPushes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { flushPushNotifications } = await import("./push.server");
    await flushPushNotifications();
    return { ok: true };
  });

export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sendPush } = await import("./push.server");
    const { data: subs } = await context.supabase.from("push_subscriptions").select("*").eq("user_id", context.userId);
    let sent = 0;
    for (const s of subs ?? []) {
      const st = await sendPush(s, { title: "Kivora notifications are on 🎉", body: "You'll get order and message alerts here.", url: "/" });
      if (st < 300) sent++;
    }
    return { sent };
  });

export const confirmReceived = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ orderId: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("confirm_order_received", { _order_id: data.orderId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
