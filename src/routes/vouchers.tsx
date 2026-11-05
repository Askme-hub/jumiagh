import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, Ticket } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { formatGHC } from "@/lib/store";

export const Route = createFileRoute("/vouchers")({
  component: Vouchers,
  head: () => ({
    meta: [
      { title: "Vouchers & Coupon Codes – Kivora Ghana" },
      { name: "description", content: "Active Kivora Ghana voucher codes. Copy a code and apply it at checkout to save." },
      { property: "og:title", content: "Vouchers & Coupon Codes – Kivora Ghana" },
      { property: "og:description", content: "Active Kivora Ghana voucher codes. Copy a code and apply it at checkout to save." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Vouchers() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["public-vouchers"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("public_vouchers");
      if (error) throw error;
      return data ?? [];
    },
  });

  const copy = async (code: string) => {
    try { await navigator.clipboard.writeText(code); toast.success(`${code} copied — apply it at checkout`); }
    catch { toast.info(`Code: ${code}`); }
  };

  return (
    <div className="pb-10">
      <PageHeader title="Vouchers" />
      <div className="max-w-2xl mx-auto p-4 space-y-3">
        <p className="text-sm text-muted-foreground">Copy a code and paste it in the Coupon Code box at checkout.</p>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && data.length === 0 && (
          <div className="py-12 text-center">
            <Ticket className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No vouchers available right now. Check back soon!</p>
            <Link to="/" className="mt-4 inline-block rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground">Keep shopping</Link>
          </div>
        )}
        {data.map((v) => (
          <div key={v.code} className="flex overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex w-24 shrink-0 flex-col items-center justify-center bg-primary p-3 text-primary-foreground">
              <span className="text-xl font-extrabold">{v.discount_type === "percent" ? `${Number(v.value)}%` : formatGHC(Number(v.value))}</span>
              <span className="text-[10px] font-bold uppercase">off</span>
            </div>
            <div className="flex-1 min-w-0 p-3">
              <p className="font-mono text-base font-bold tracking-wider">{v.code}</p>
              <p className="text-xs text-muted-foreground">
                {v.shop_name ? `On ${v.shop_name} items` : "On everything"}
                {Number(v.min_spend) > 0 ? ` · Min. spend ${formatGHC(Number(v.min_spend))}` : ""}
              </p>
              {v.expires_at && <p className="text-[11px] text-muted-foreground">Expires {new Date(v.expires_at).toLocaleDateString()}</p>}
            </div>
            <button onClick={() => copy(v.code)} className="flex items-center gap-1 px-4 text-xs font-bold text-primary" aria-label={`Copy ${v.code}`}>
              <Copy size={14} /> Copy
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
