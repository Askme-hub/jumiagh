import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, X, ShieldCheck, ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/sellers")({ component: AdminSellers });

function AdminSellers() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "suspended">("all");

  const { data: sellers } = useQuery({
    queryKey: ["admin-sellers", filter],
    queryFn: async () => {
      let q = supabase.from("seller_profiles").select("*").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
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

  const pending = sellers?.filter((s) => s.status === "pending").length ?? 0;

  return (
    <div>
      <div className="p-3 flex flex-wrap gap-2 items-center border-b">
        <p className="text-sm font-semibold mr-2">Filter:</p>
        {(["all", "pending", "approved", "suspended"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs rounded-full font-bold uppercase ${
              filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
            }`}
          >
            {s} {s === "pending" && pending > 0 && `(${pending})`}
          </button>
        ))}
      </div>

      <div className="md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3 md:p-3">
        {sellers?.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No sellers.</p>}
        {sellers?.map((s) => (
          <div key={s.user_id} className="p-3 border-b md:border md:rounded-lg border-border bg-card">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold truncate">{s.shop_name}</p>
                <p className="text-xs text-muted-foreground truncate">{s.phone ?? "no phone"}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.bio ?? "—"}</p>
                <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  s.status === "approved" ? "bg-green-100 text-green-700" :
                  s.status === "pending" ? "bg-amber-100 text-amber-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {s.status}
                </span>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              {s.status !== "approved" && (
                <button
                  onClick={() => setStatus(s.user_id, "approved")}
                  className="flex-1 bg-green-600 text-white text-xs font-bold py-2 rounded flex items-center justify-center gap-1"
                >
                  <Check size={14} /> Approve
                </button>
              )}
              {s.status === "approved" && (
                <button
                  onClick={() => setStatus(s.user_id, "suspended")}
                  className="flex-1 bg-red-600 text-white text-xs font-bold py-2 rounded flex items-center justify-center gap-1"
                >
                  <ShieldOff size={14} /> Suspend
                </button>
              )}
              {s.status === "suspended" && (
                <button
                  onClick={() => setStatus(s.user_id, "approved")}
                  className="flex-1 bg-primary text-primary-foreground text-xs font-bold py-2 rounded flex items-center justify-center gap-1"
                >
                  <ShieldCheck size={14} /> Reinstate
                </button>
              )}
              {s.status === "pending" && (
                <button
                  onClick={() => setStatus(s.user_id, "suspended")}
                  className="flex-1 bg-muted text-foreground text-xs font-bold py-2 rounded flex items-center justify-center gap-1"
                >
                  <X size={14} /> Reject
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
