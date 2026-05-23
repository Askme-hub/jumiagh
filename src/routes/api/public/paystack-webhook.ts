import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/paystack-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) return new Response("Not configured", { status: 500 });

        const body = await request.text();
        const signature = request.headers.get("x-paystack-signature") ?? "";
        const expected = createHmac("sha512", secret).update(body).digest("hex");

        try {
          if (
            signature.length !== expected.length ||
            !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
          ) {
            return new Response("Invalid signature", { status: 401 });
          }
        } catch {
          return new Response("Invalid signature", { status: 401 });
        }

        const event = JSON.parse(body);
        if (event.event === "charge.success") {
          const reference = event.data?.reference as string | undefined;
          const amount = event.data?.amount as number | undefined;
          if (reference) {
            const { data: order } = await supabaseAdmin
              .from("orders")
              .select("id, total, payment_status")
              .eq("payment_reference", reference)
              .maybeSingle();
            if (order && order.payment_status !== "paid") {
              const amountMatches = amount != null && Math.round(Number(order.total) * 100) === amount;
              if (amountMatches) {
                await supabaseAdmin
                  .from("orders")
                  .update({
                    payment_status: "paid",
                    amount_paid: amount! / 100,
                    status: "placed",
                  })
                  .eq("id", order.id);
              }
            }
          }
        }
        return new Response("ok");
      },
    },
  },
});
