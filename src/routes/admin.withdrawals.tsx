import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDownToLine } from "lucide-react";
import { formatGHC } from "@/lib/store";
import { getAllWithdrawals, decideWithdrawal } from "@/lib/wallet.functions";

export const Route = createFileRoute("/admin/withdrawals")({
  component: AdminWithdrawals,
  head: () => ({ meta: [{ title: "Withdrawals – Kivora Admin" }] }),
});

const FILTERS = ["all", "pending", "approved", "paid", "rejected"] as const;

function AdminWithdrawals() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(getAllWithdrawals);
  const decide = useServerFn(decideWithdrawal);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: () => fetchAll(),
  });

  const act = async (id: string, status: "approved" | "rejected" | "paid") => {
    setBusyId(id);
    try {
      await decide({ data: { id, status } });
      toast.success(`Marked as ${status}`);
      qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const shown = (requests ?? []).filter((r) => filter === "all" || r.status === filter);

  return (
    <div className="p-4 space-y-4">
      <h1 className="font-bold text-lg flex items-center gap-2">
        <ArrowDownToLine size={20} /> Withdrawal Requests
      </h1>

      <div className="flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">No {filter === "all" ? "" : filter} requests.</p>
      ) : (
        <div className="space-y-3">
          {shown.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-lg">{formatGHC(Number(r.amount))}</p>
                  <p className="text-sm font-medium">{r.shop_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.method} · {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                <p>Account: {r.account_details ?? "—"}</p>
                {r.shop_phone && <p>Phone: {r.shop_phone}</p>}
                {r.admin_note && <p>Note: {r.admin_note}</p>}
              </div>
              {(r.status === "pending" || r.status === "approved") && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.status === "pending" && (
                    <button
                      onClick={() => act(r.id, "approved")}
                      disabled={busyId === r.id}
                      className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold disabled:opacity-60"
                    >
                      Approve
                    </button>
                  )}
                  <button
                    onClick={() => act(r.id, "paid")}
                    disabled={busyId === r.id}
                    className="px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-semibold disabled:opacity-60"
                  >
                    Mark Paid
                  </button>
                  <button
                    onClick={() => act(r.id, "rejected")}
                    disabled={busyId === r.id}
                    className="px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-xs font-semibold disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-blue-100 text-blue-700",
    paid: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}
