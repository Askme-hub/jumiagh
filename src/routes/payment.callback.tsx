import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { verifyPaystackPayment } from "@/lib/paystack.functions";

export const Route = createFileRoute("/payment/callback")({
  component: PaymentCallback,
  head: () => ({ meta: [{ title: "Payment – Jumia Ghana" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    ref: typeof s.ref === "string" ? s.ref : (typeof s.reference === "string" ? s.reference : ""),
  }),
});

function PaymentCallback() {
  const { ref } = Route.useSearch();
  const router = useRouter();
  const verify = useServerFn(verifyPaystackPayment);
  const [state, setState] = useState<"loading" | "paid" | "failed">("loading");
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!ref) { setState("failed"); return; }
    verify({ data: { reference: ref } })
      .then((r) => { setState(r.status as any); setOrderId(r.order_id); })
      .catch(() => setState("failed"));
  }, [ref]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      {state === "loading" && (
        <>
          <Loader2 size={56} className="animate-spin text-primary mb-4" />
          <h1 className="text-xl font-bold">Verifying your payment…</h1>
        </>
      )}
      {state === "paid" && (
        <>
          <CheckCircle2 size={72} className="text-success mb-4" />
          <h1 className="text-2xl font-bold mb-2">Payment Successful</h1>
          <p className="text-muted-foreground mb-6">Your order is now being processed.</p>
          <button
            onClick={() => orderId && router.navigate({ to: "/orders/$id", params: { id: orderId } })}
            className="bg-primary text-primary-foreground font-bold px-6 py-3 rounded-md"
          >
            View Order
          </button>
        </>
      )}
      {state === "failed" && (
        <>
          <XCircle size={72} className="text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Payment Failed</h1>
          <p className="text-muted-foreground mb-6">We couldn't confirm your payment.</p>
          <button
            onClick={() => router.navigate({ to: "/cart" })}
            className="bg-primary text-primary-foreground font-bold px-6 py-3 rounded-md"
          >
            Back to Cart
          </button>
        </>
      )}
    </div>
  );
}
