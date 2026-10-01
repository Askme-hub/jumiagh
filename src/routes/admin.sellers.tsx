import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, X, ShieldCheck, ShieldOff, BadgeCheck, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/sellers")({ component: AdminSellers });

type VStatus = "not_verified" | "pending" | "verified" | "rejected";

const V_LABEL: Record<VStatus, string> = {
  not_verified: "Not verified",
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
};

const V_CLASS: Record<VStatus, string> = {
  not_verified: "bg-muted text-muted-foreground",
  pending: "bg-warning/15 text-warning",
  verified: "bg-primary-soft text-primary",
  rejected: "bg-destructive/10 text-destructive",
};

type Confirm = { userId: string; shop: string; next: VStatus; title: string; body: string } | null;

function AdminSellers() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "suspended">("all");
  const [vFilter, setVFilter] = useState<"all" | VStatus>("all");
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [note, setNote] = useState("");

  const { data: sellers } = useQuery({
    queryKey: ["admin-sellers", filter, vFilter],
    queryFn: async () => {
      let q = supabase.from("seller_profiles").select("*").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      if (vFilter !== "all") q = (q as any).eq("verification_status", vFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const setStatus = async (userId: string, status: "approved" | "suspended" | "pending") => {
    const { error } = await supabase.from("seller_profiles").update({ status }).eq("user_id", userId);
    if (error) return toast.error(error.message);
    if (status === "approved") {
      await supabase.from("user_roles").upsert({ user_id: userId, role: "seller" as any }, { onConflict: "user_id,role" });
    } else if (status === "suspended") {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "seller");
    }
    toast.success(`Seller ${status}`);
    qc.invalidateQueries({ queryKey: ["admin-sellers"] });
  };

  const applyVerification = async () => {
    if (!confirm) return;
    const { error } = await supabase
      .from("seller_profiles")
      .update({ verification_status: confirm.next, verification_note: note.trim() || null } as any)
      .eq("user_id", confirm.userId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${confirm.shop}: ${V_LABEL[confirm.next]}`);
      qc.invalidateQueries({ queryKey: ["admin-sellers"] });
    }
    setConfirm(null);
    setNote("");
  };

  const ask = (userId: string, shop: string, next: VStatus) => {
    const copy: Record<VStatus, { title: string; body: string }> = {
      verified: { title: "Verify seller?", body: `${shop} will display the Kivora Verified badge publicly.` },
      rejected: { title: "Reject verification?", body: `${shop} will be marked as rejected and will not show the badge.` },
      not_verified: { title: "Remove verification?", body: `${shop} will lose the Kivora Verified badge.` },
      pending: { title: "Start verification?", body: `${shop} will be marked as pending review.` },
    };
    setNote("");
    setConfirm({ userId, shop, next, ...copy[next] });
  };

  const pending = sellers?.filter((s) => s.status === "pending").length ?? 0;
  const vPending = sellers?.filter((s: any) => s.verification_status === "pending").length ?? 0;

  return (
    <div>
      <div className="space-y-2 border-b p-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-1 text-sm font-semibold">Status:</p>
          {(["all", "pending", "approved", "suspended"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase ${
                filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}
            >
              {s} {s === "pending" && pending > 0 && `(${pending})`}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-1 text-sm font-semibold">Verification:</p>
          {(["all", "not_verified", "pending", "verified", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setVFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase ${
                vFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}
            >
              {s === "all" ? "all" : V_LABEL[s]} {s === "pending" && vPending > 0 && `(${vPending})`}
            </button>
          ))}
        </div>
      </div>

      <div className="md:grid md:grid-cols-2 md:gap-3 md:p-3 lg:grid-cols-3">
        {sellers?.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No sellers.</p>}
        {sellers?.map((s: any) => {
          const vs: VStatus = (s.verification_status ?? "not_verified") as VStatus;
          return (
            <div key={s.user_id} className="border-b border-border bg-card p-3 md:rounded-lg md:border">
              <div className="min-w-0">
                <p className="truncate font-bold">{s.shop_name}</p>
                <p className="truncate text-xs text-muted-foreground">{s.phone ?? "no phone"}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.bio ?? "—"}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      s.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : s.status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {s.status}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${V_CLASS[vs]}`}>
                    {vs === "verified" ? <BadgeCheck size={11} /> : vs === "pending" ? <Clock size={11} /> : null}
                    {V_LABEL[vs]}
                  </span>
                </div>
                {s.verification_note && (
                  <p className="mt-1 text-[11px] text-muted-foreground">Note: {s.verification_note}</p>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                {s.status !== "approved" && (
                  <button
                    onClick={() => setStatus(s.user_id, "approved")}
                    className="flex flex-1 items-center justify-center gap-1 rounded bg-green-600 py-2 text-xs font-bold text-white"
                  >
                    <Check size={14} /> Approve
                  </button>
                )}
                {s.status === "approved" && (
                  <button
                    onClick={() => setStatus(s.user_id, "suspended")}
                    className="flex flex-1 items-center justify-center gap-1 rounded bg-red-600 py-2 text-xs font-bold text-white"
                  >
                    <ShieldOff size={14} /> Suspend
                  </button>
                )}
                {s.status === "suspended" && (
                  <button
                    onClick={() => setStatus(s.user_id, "approved")}
                    className="flex flex-1 items-center justify-center gap-1 rounded bg-primary py-2 text-xs font-bold text-primary-foreground"
                  >
                    <ShieldCheck size={14} /> Reinstate
                  </button>
                )}
                {s.status === "pending" && (
                  <button
                    onClick={() => setStatus(s.user_id, "suspended")}
                    className="flex flex-1 items-center justify-center gap-1 rounded bg-muted py-2 text-xs font-bold text-foreground"
                  >
                    <X size={14} /> Reject
                  </button>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-2 border-t border-border pt-2">
                {vs !== "pending" && vs !== "verified" && (
                  <button
                    onClick={() => ask(s.user_id, s.shop_name, "pending")}
                    className="rounded-full bg-muted px-3 py-1.5 text-[11px] font-bold text-foreground"
                  >
                    Mark pending
                  </button>
                )}
                {vs !== "verified" && (
                  <button
                    onClick={() => ask(s.user_id, s.shop_name, "verified")}
                    className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground"
                  >
                    Verify
                  </button>
                )}
                {vs !== "rejected" && vs !== "verified" && (
                  <button
                    onClick={() => ask(s.user_id, s.shop_name, "rejected")}
                    className="rounded-full bg-destructive/10 px-3 py-1.5 text-[11px] font-bold text-destructive"
                  >
                    Reject verification
                  </button>
                )}
                {vs === "verified" && (
                  <button
                    onClick={() => ask(s.user_id, s.shop_name, "not_verified")}
                    className="rounded-full bg-destructive/10 px-3 py-1.5 text-[11px] font-bold text-destructive"
                  >
                    Remove verification
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 sm:items-center sm:p-4"
          onClick={() => setConfirm(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-sm rounded-t-3xl border border-border/60 bg-card p-5 shadow-elevated sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-extrabold text-foreground">{confirm.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{confirm.body}</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Internal note (optional)"
              className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 rounded-full bg-muted py-2.5 text-sm font-bold text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={applyVerification}
                className="flex-1 rounded-full gradient-primary py-2.5 text-sm font-bold text-primary-foreground"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
