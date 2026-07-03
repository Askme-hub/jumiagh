import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { verifySubscriptionPayment } from "@/lib/subscriptions.functions";

export const Route = createFileRoute("/subscription/callback")({
  component: SubscriptionCallback,
  head: () => ({ meta: [{ title: "Subscription – Kivora" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    ref:
      typeof s.ref === "string"
        ? s.ref
        : typeof s.reference === "string"
          ? s.reference
          : "",
  }),
});

function SubscriptionCallback() {
  const { ref } = Route.useSearch();
  const router = useRouter();
  const verify = useServerFn(verifySubscriptionPayment);
  const [state, setState] = useState<"loading" | "paid" | "failed">("loading");
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!ref) {
      setState("failed");
      return;
    }
    verify({ data: { reference: ref } })
      .then((r) => {
        setState(r.status);
        setPlan(r.plan);
      })
      .catch(() => setState("failed"));
  }, [ref]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      {state === "loading" && (
        <>
          <Loader2 size={56} className="animate-spin text-primary mb-4" />
          <h1 className="text-xl font-bold">Activating your plan…</h1>
        </>
      )}
      {state === "paid" && (
        <>
          <CheckCircle2 size={72} className="text-success mb-4" />
          <h1 className="text-2xl font-bold mb-2 capitalize">{plan} plan activated!</h1>
          <p className="text-muted-foreground mb-6">
            Your subscription is live. Enjoy lower commissions and more selling power.
          </p>
          <button
            onClick={() => router.navigate({ to: "/seller/subscription" })}
            className="bg-primary text-primary-foreground font-bold px-6 py-3 rounded-md"
          >
            Back to Plans
          </button>
        </>
      )}
      {state === "failed" && (
        <>
          <XCircle size={72} className="text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Payment not confirmed</h1>
          <p className="text-muted-foreground mb-6">We couldn't activate your plan.</p>
          <button
            onClick={() => router.navigate({ to: "/seller/subscription" })}
            className="bg-primary text-primary-foreground font-bold px-6 py-3 rounded-md"
          >
            Try Again
          </button>
        </>
      )}
    </div>
  );
}
