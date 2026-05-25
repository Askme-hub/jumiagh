import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/orders/$id/status")({
  component: ItemStatus,
  head: () => ({ meta: [{ title: "Item Status – Jumia Ghana" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
});

const LABELS: Record<string, string> = {
  placed: "ORDER PLACED",
  pending_confirmation: "PENDING CONFIRMATION",
  waiting_to_be_shipped: "WAITING TO BE SHIPPED",
  shipped: "SHIPPED",
  available_for_pickup: "AVAILABLE FOR PICKUP",
  delivered: "DELIVERED",
  cancelled: "CANCELLED",
};

function ItemStatus() {
  const { id } = Route.useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["order-history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_status_history")
        .select("status, created_at")
        .eq("order_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Item Status" />
        <p className="p-6 text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Item Status" />
        <p className="p-6 text-sm text-destructive">
          Failed to load status history.
        </p>
      </div>
    );
  }

  const history = data ?? [];
  const lastIdx = history.length - 1;

  return (
    <div>
      <PageHeader title="Item Status" />

      <h1 className="px-4 py-3 text-2xl font-bold">Item Status</h1>

      <div className="px-4 py-6 bg-card">
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No status history found.</p>
        ) : (
          <ol className="relative pl-2">
            {history.map((h, i) => {
              const isLast = i === lastIdx;
              const delivered = h.status === "delivered";

              return (
                <li key={i} className="relative pl-12 pb-8 last:pb-0">
                  {i !== lastIdx && (
                    <span className="absolute left-[15px] top-7 bottom-0 w-0.5 bg-border" />
                  )}

                  <span
                    className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      isLast
                        ? "border-4 border-success bg-background"
                        : "bg-primary text-white"
                    }`}
                  >
                    {!isLast ? (
                      <Check size={18} strokeWidth={3} className="text-white" />
                    ) : delivered ? (
                      <Check size={18} strokeWidth={3} className="text-success" />
                    ) : (
                      <Circle size={14} className="text-success" />
                    )}
                  </span>

                  <span
                    className={`inline-block px-2.5 py-1 text-xs font-bold rounded ${
                      delivered ? "bg-success text-white" : "bg-primary text-white"
                    }`}
                  >
                    {LABELS[h.status] ?? h.status.toUpperCase()}
                  </span>

                  <p className="mt-2 text-sm text-muted-foreground">
                    {new Date(h.created_at).toLocaleString()}
                  </p>

                  {isLast && delivered && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Your item/order has been delivered.
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="h-20" />
    </div>
  );
}
