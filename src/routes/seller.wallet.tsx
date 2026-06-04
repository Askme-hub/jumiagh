import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wallet, ArrowDownToLine, Clock, TrendingUp, Plus, Trash2, Check, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatGHC } from "@/lib/store";
import { requestWithdrawal } from "@/lib/wallet.functions";
import {
  usePayoutAccounts,
  useSavePayoutAccount,
  useDeletePayoutAccount,
} from "@/lib/payout-accounts";

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
  const [busy, setBusy] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  // Add-account form
  const [showForm, setShowForm] = useState(false);
  const [method, setMethod] = useState(METHODS[0]);
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [provider, setProvider] = useState("");
  const [makeDefault, setMakeDefault] = useState(true);

  const { data: accounts = [] } = usePayoutAccounts();
  const saveAccount = useSavePayoutAccount();
  const deleteAccount = useDeletePayoutAccount();

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

  // Default selected account
  useEffect(() => {
    if (selectedAccount || accounts.length === 0) {
      if (accounts.length === 0) setShowForm(true);
      return;
    }
    const def = accounts.find((a) => a.is_default) ?? accounts[0];
    setSelectedAccount(def.id);
  }, [accounts, selectedAccount]);

  if (!user) return <div className="p-6 text-sm">Please log in.</div>;

  const balance = Number(wallet?.balance ?? 0);

  const addAccount = async () => {
    if (accountName.trim().length < 2) return toast.error("Enter the account holder name");
    if (accountNumber.trim().length < 4) return toast.error("Enter a valid account / phone number");
    try {
      const saved = await saveAccount.mutateAsync({
        method,
        account_name: accountName.trim(),
        account_number: accountNumber.trim(),
        provider: provider.trim() || null,
        is_default: makeDefault || accounts.length === 0,
      });
      setSelectedAccount(saved.id);
      setAccountName("");
      setAccountNumber("");
      setProvider("");
      setShowForm(false);
      toast.success("Payout account saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save account");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (amt > balance) return toast.error("Amount exceeds available balance");
    if (!selectedAccount) return toast.error("Select a saved payout account");
    setBusy(true);
    try {
      await submit({ data: { amount: amt, payout_account_id: selectedAccount } });
      toast.success("Withdrawal request submitted");
      setAmount("");
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

      {/* Saved payout accounts */}
      <section className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2">
          <CreditCard size={18} className="text-primary" />
          <h2 className="font-bold flex-1">Payout Accounts</h2>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="text-primary text-xs font-bold flex items-center gap-1"
          >
            <Plus size={14} /> {showForm ? "Cancel" : "Add account"}
          </button>
        </div>

        {accounts.length > 0 && (
          <div className="mt-3 space-y-2">
            {accounts.map((a) => {
              const active = selectedAccount === a.id;
              return (
                <div
                  key={a.id}
                  className={`p-3 rounded-lg border-2 ${active ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <button onClick={() => setSelectedAccount(a.id)} className="w-full text-left flex gap-2">
                    <div className="mt-0.5">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${active ? "border-primary bg-primary" : "border-border"}`}>
                        {active && <Check size={10} className="text-primary-foreground" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm">{a.account_name}</p>
                        {a.is_default && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-semibold uppercase">Default</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.method}{a.provider ? ` · ${a.provider}` : ""} · {a.account_number}
                      </p>
                    </div>
                  </button>
                  <div className="flex justify-end mt-1">
                    <button
                      onClick={() => {
                        if (confirm("Remove this payout account?")) {
                          deleteAccount.mutate(a.id, {
                            onSuccess: () => { if (selectedAccount === a.id) setSelectedAccount(null); },
                          });
                        }
                      }}
                      className="text-destructive text-xs font-semibold flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(showForm || accounts.length === 0) && (
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            <p className="text-xs font-bold uppercase text-muted-foreground">New payout account</p>
            <select
              value={method} onChange={(e) => setMethod(e.target.value)}
              className="w-full border-2 border-border focus:border-primary rounded-md px-3 py-2 outline-none bg-background"
            >
              {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <input
              value={accountName} onChange={(e) => setAccountName(e.target.value)}
              className="w-full border-2 border-border focus:border-primary rounded-md px-3 py-2 outline-none"
              placeholder="Account holder name"
            />
            <input
              value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
              className="w-full border-2 border-border focus:border-primary rounded-md px-3 py-2 outline-none"
              placeholder="Account / MoMo number"
            />
            <input
              value={provider} onChange={(e) => setProvider(e.target.value)}
              className="w-full border-2 border-border focus:border-primary rounded-md px-3 py-2 outline-none"
              placeholder="Provider / Bank (e.g. MTN, GCB Bank)"
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} />
              Set as default payout account
            </label>
            <button
              onClick={addAccount}
              disabled={saveAccount.isPending}
              className="w-full bg-foreground text-background font-bold py-2.5 rounded-md disabled:opacity-60"
            >
              {saveAccount.isPending ? "Saving…" : "Save account"}
            </button>
          </div>
        )}
      </section>

      {/* Request withdrawal */}
      <section className="bg-card border border-border rounded-xl p-4">
        <h2 className="font-bold flex items-center gap-2"><ArrowDownToLine size={18} /> Request Withdrawal</h2>
        {accounts.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Add a payout account above to withdraw your earnings.</p>
        ) : (
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
            <p className="text-xs text-muted-foreground">
              Funds will be sent to your selected payout account above.
            </p>
            <button
              type="submit" disabled={busy || balance <= 0 || !selectedAccount}
              className="w-full bg-primary text-primary-foreground font-bold py-2.5 rounded-md disabled:opacity-60"
            >
              {busy ? "Submitting…" : "Request withdrawal"}
            </button>
          </form>
        )}
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
