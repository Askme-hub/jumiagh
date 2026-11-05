import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Truck, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDeliveryZones } from "@/lib/use-delivery-zones";
import type { DeliveryZone } from "@/lib/delivery-zones";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/delivery")({
  component: AdminDelivery,
  head: () => ({ meta: [
    { title: "Delivery Fees — Kivora Admin" },
    { name: "description", content: "Set door-delivery prices and times for each region of Ghana." },
    { property: "og:title", content: "Delivery Fees — Kivora Admin" },
    { property: "og:description", content: "Manage Kivora delivery zone prices." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function AdminDelivery() {
  const { data: zones = [] } = useDeliveryZones();
  const qc = useQueryClient();
  const [rows, setRows] = useState<DeliveryZone[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  useEffect(() => setRows(zones), [zones]);

  const update = (id: string, patch: Partial<DeliveryZone>) =>
    setRows((r) => r.map((z) => (z.id === id ? { ...z, ...patch } : z)));

  const save = async (z: DeliveryZone) => {
    setSaving(z.id);
    const { error } = await supabase
      .from("delivery_zones")
      .update({ fee: Math.max(0, Number(z.fee) || 0), eta: z.eta, label: z.label, updated_at: new Date().toISOString() })
      .eq("id", z.id);
    setSaving(null);
    if (error) return toast.error(error.message);
    toast.success(`${z.label} updated`);
    qc.invalidateQueries({ queryKey: ["delivery-zones"] });
  };

  return (
    <div className="dashboard-canvas p-4 md:p-6">
      <p className="text-xs font-bold text-primary">LOGISTICS</p>
      <h1 className="font-display text-2xl font-bold">Delivery fees</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Minimum door-delivery price per region. Sellers can charge more from their shop settings — the higher price applies at checkout.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {rows.map((z) => (
          <section key={z.id} className="dashboard-panel space-y-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary"><Truck size={18} /></div>
              <div className="min-w-0">
                <input value={z.label} onChange={(e) => update(z.id, { label: e.target.value })}
                  className="w-full bg-transparent font-display text-lg font-bold outline-none" />
                <p className="text-xs text-muted-foreground">{z.regions.length ? z.regions.join(", ") : "All other regions"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-muted-foreground">Fee (GH₵)
                <input type="number" min="0" step="0.5" value={z.fee}
                  onChange={(e) => update(z.id, { fee: Number(e.target.value) })}
                  className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground" />
              </label>
              <label className="text-xs font-semibold text-muted-foreground">Delivery time
                <input value={z.eta} onChange={(e) => update(z.id, { eta: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground" />
              </label>
            </div>
            <Button onClick={() => save(z)} disabled={saving === z.id} className="w-full">
              <Save size={16} /> {saving === z.id ? "Saving…" : "Save"}
            </Button>
          </section>
        ))}
      </div>
    </div>
  );
}
