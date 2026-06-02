import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Wallet, ArrowDownToLine, Clock, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatGHC } from "@/lib/store";
import { requestWithdrawal } from "@/lib/wallet.functions";

export const Route = createFileRoute("/seller/wallet")({
  component: SellerWallet,
  head: () => ({ meta: [{ title: "Wallet — Kivora Seller" }] }),
});

const METHODS = ["Mobile Money", "Bank Transfer", "Paystack"];

function SellerWallet() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const submit = useServerFn(requestWithdrawal);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(METHODS[0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: wallet } = useQuery({
    queryKey: ["seller-wallet", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("seller_wallets")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: txns } = useQuery({
    queryKey: ["seller-txns", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const { data: requests } = useQuery({
    queryKey: ["seller-withdrawals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (!user) return <div className="p-6 text-sm">Please log in.</div>;

  const balance = Number(wallet?.balance ?? 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (amt > balance) return toast.error("Amount exceeds available balance");
    if (details.trim().length < 2) return toast.error("Enter your payout account details");
    setBusy(true);
    try {
      await submit({ data: { amount: amt, method, account_details: details.trim() } });
      toast.success("Withdrawal request submitted");
      setAmount("");
      setDetails("");
      qc.invalidateQueries({ queryKey: ["seller-wallet", user.id] });
      qc.invalidateQueries({ queryKey: ["seller-withdrawals", user.id] });
      qc.invalidateQueries({ queryKey: ["seller-txns", user.id] });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to submit request");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Available" value={formatGHC(balance)} icon={Wallet} color="text-green-600" />
        <StatCard label="Pending" value={formatGHC(Number(wallet?.pending ?? 0))} icon={Clock} color="text-amber-600" />
        <StatCard label="Total Earned" value={formatGHC(Number(wallet?.total_earned ?? 0))} icon={TrendingUp} color="text-primary" />
        <StatCard label="Withdrawn" value={formatGHC(Number(wallet?.total_withdrawn ?? 0))} icon={ArrowDownToLine} color="text-muted-foreground" />
      </div>

      <section className="bg-card border border-border rounded-xl p-4">
        <h2 className="font-bold flex items-center gap-2"><ArrowDownToLine size={18} /> Request Withdrawal</h2>
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Amount (max {formatGHC(balance)})</label>
            <input
              type="number" min="1" step="0.01" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full mt-1 border-2 border-border focus:border-primary rounded-md px-3 py-2 outline-none"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Payout method</label>
            <select
              value={method} onChange={(e) => setMethod(e.target.value)}
              className="w-full mt-1 border-2 border-border focus:border-primary rounded-md px-3 py-2 outline-none bg-background"
            >
              {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Account details</label>
            <input
              value={details} onChange={(e) => setDetails(e.target.value)}
              className="w-full mt-1 border-2 border-border focus:border-primary rounded-md px-3 py-2 outline-none"
              placeholder="e.g. MoMo 024 000 0000 / Bank acct no."
            />
          </div>
          <button
            type="submit" disabled={busy || balance <= 0}
            className="w-full bg-primary text-primary-foreground font-bold py-2.5 rounded-md disabled:opacity-60"
          >
            {busy ? "Submitting…" : "Request withdrawal"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-bold mb-2">Withdrawal Requests</h2>
        {requests?.length ? (
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{formatGHC(Number(r.amount))}</p>
                  <p className="text-xs text-muted-foreground">{r.method} · {new Date(r.created_at).toLocaleDateString()}</p>
                  {r.admin_note && <p className="text-xs text-muted-foreground mt-0.5">Note: {r.admin_note}</p>}
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No withdrawal requests yet.</p>
        )}
      </section>

      <section>
        <h2 className="font-bold mb-2">Transaction History</h2>
        {txns?.length ? (
          <div className="space-y-1.5">
            {txns.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm border-b border-border py-2">
                <div>
                  <p className="font-medium">{t.description ?? t.type}</p>
                  <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                </div>
                <span className={Number(t.amount) >= 0 ? "text-green-600 font-semibold" : "text-destructive font-semibold"}>
                  {Number(t.amount) >= 0 ? "+" : ""}{formatGHC(Number(t.amount))}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No transactions yet. Earnings appear when orders are delivered.</p>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <Icon size={18} className={color} />
      <p className="text-lg font-bold mt-1 truncate">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
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
