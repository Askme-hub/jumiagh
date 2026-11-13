import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUp, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type Product = {
  id: string;
  name: string;
  stock: number;
  barcode: string | null;
  price: number;
};

type RowResult = {
  line: number;
  name?: string;
  barcode?: string;
  stock?: number;
  status: "ok" | "skip" | "error";
  message: string;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim());
      cell = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell.length || row.length) {
    row.push(cell.trim());
    if (row.some((c) => c !== "")) rows.push(row);
  }
  return rows;
}

export function PosImport() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [raw, setRaw] = useState("");
  const [results, setResults] = useState<RowResult[] | null>(null);

  const { data: products = [] } = useQuery({
    queryKey: ["pos-import-products", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, stock, barcode, price")
        .eq("seller_id", user!.id);
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

  const preview = useMemo(() => {
    if (!raw.trim()) return [];
    const rows = parseCsv(raw.trim());
    if (!rows.length) return [];
    const header = rows[0].map((h) => h.toLowerCase());
    const hasHeader =
      header.includes("barcode") ||
      header.includes("name") ||
      header.includes("stock") ||
      header.includes("sku");
    const dataRows = hasHeader ? rows.slice(1) : rows;
    const idx = {
      barcode: header.findIndex((h) => h === "barcode" || h === "sku" || h === "code"),
      name: header.findIndex((h) => h === "name" || h === "product"),
      stock: header.findIndex((h) => h === "stock" || h === "qty" || h === "quantity"),
    };
    // fallback columns if no header: barcode, stock, name
    return dataRows.slice(0, 50).map((cols, i) => {
      if (hasHeader) {
        return {
          line: i + 2,
          barcode: idx.barcode >= 0 ? cols[idx.barcode] : "",
          name: idx.name >= 0 ? cols[idx.name] : "",
          stock: idx.stock >= 0 ? cols[idx.stock] : "",
        };
      }
      return {
        line: i + 1,
        barcode: cols[0] ?? "",
        stock: cols[1] ?? "",
        name: cols[2] ?? "",
      };
    });
  }, [raw]);

  const run = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const rows = parseCsv(raw.trim());
      if (!rows.length) throw new Error("CSV is empty");

      const header = rows[0].map((h) => h.toLowerCase());
      const hasHeader =
        header.includes("barcode") ||
        header.includes("name") ||
        header.includes("stock") ||
        header.includes("sku");
      const dataRows = hasHeader ? rows.slice(1) : rows;
      const idx = {
        barcode: header.findIndex((h) => h === "barcode" || h === "sku" || h === "code"),
        name: header.findIndex((h) => h === "name" || h === "product"),
        stock: header.findIndex((h) => h === "stock" || h === "qty" || h === "quantity"),
      };

      const byBarcode = new Map(
        products
          .filter((p) => (p.barcode ?? "").trim())
          .map((p) => [(p.barcode ?? "").trim().toLowerCase(), p])
      );
      const byName = new Map(products.map((p) => [p.name.trim().toLowerCase(), p]));

      const out: RowResult[] = [];
      let ok = 0;

      for (let i = 0; i < dataRows.length; i++) {
        const cols = dataRows[i];
        const line = hasHeader ? i + 2 : i + 1;
        const barcode = (hasHeader ? (idx.barcode >= 0 ? cols[idx.barcode] : "") : cols[0] ?? "").trim();
        const stockRaw = (hasHeader ? (idx.stock >= 0 ? cols[idx.stock] : "") : cols[1] ?? "").trim();
        const name = (hasHeader ? (idx.name >= 0 ? cols[idx.name] : "") : cols[2] ?? "").trim();

        if (!barcode && !name) {
          out.push({ line, status: "skip", message: "Empty row" });
          continue;
        }

        let product =
          (barcode ? byBarcode.get(barcode.toLowerCase()) : undefined) ||
          (name ? byName.get(name.toLowerCase()) : undefined);

        // If matching by name only, we can set barcode
        if (!product && name) product = byName.get(name.toLowerCase());

        if (!product) {
          out.push({
            line,
            barcode,
            name,
            status: "error",
            message: "No matching product (match by barcode or exact name)",
          });
          continue;
        }

        const patch: { barcode?: string | null; stock?: number } = {};
        if (barcode) patch.barcode = barcode;
        if (stockRaw !== "") {
          const n = Number(stockRaw);
          if (!Number.isInteger(n) || n < 0) {
            out.push({
              line,
              barcode,
              name: product.name,
              status: "error",
              message: "Invalid stock",
            });
            continue;
          }
          patch.stock = n;
        }
        if (Object.keys(patch).length === 0) {
          out.push({ line, status: "skip", message: "Nothing to update", name: product.name });
          continue;
        }

        const { error } = await supabase
          .from("products")
          .update(patch)
          .eq("id", product.id)
          .eq("seller_id", user.id);
        if (error) {
          out.push({
            line,
            barcode,
            name: product.name,
            status: "error",
            message: error.message,
          });
          continue;
        }
        // refresh local maps if barcode set
        if (patch.barcode) {
          byBarcode.set(patch.barcode.toLowerCase(), { ...product, barcode: patch.barcode });
        }
        if (patch.stock != null) {
          product = { ...product, stock: patch.stock };
          byName.set(product.name.trim().toLowerCase(), product);
        }
        ok++;
        out.push({
          line,
          barcode: patch.barcode ?? product.barcode ?? undefined,
          name: product.name,
          stock: patch.stock,
          status: "ok",
          message: "Updated",
        });
      }

      return { out, ok };
    },
    onSuccess: ({ out, ok }) => {
      setResults(out);
      toast.success(`${ok} product${ok === 1 ? "" : "s"} updated`);
      qc.invalidateQueries({ queryKey: ["pos-import-products"] });
      qc.invalidateQueries({ queryKey: ["pos-inventory"] });
      qc.invalidateQueries({ queryKey: ["pos-products"] });
      qc.invalidateQueries({ queryKey: ["seller-products-summary"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sample = `barcode,stock,name
6001234567890,25,Sample Rice 5kg
6009876543210,10,Cooking Oil 1L
,5,Exact Product Name Here`;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-bold">Bulk barcode & stock import</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload or paste a CSV to set barcodes and/or stock on existing products. Rows match by{" "}
          <strong>barcode</strong> or exact <strong>product name</strong>. New products are not
          created here — add those under{" "}
          <Link to="/seller/products/new" className="font-semibold text-primary">
            Products
          </Link>
          .
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-muted p-3 text-[11px] leading-relaxed">
{sample}
        </pre>
        <p className="mt-2 text-xs text-muted-foreground">
          Header optional. Without header: <code>barcode,stock,name</code>
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-4 py-8 text-center hover:bg-muted/40">
          <FileUp className="h-6 w-6 text-primary" />
          <span className="text-sm font-semibold">Choose CSV file</span>
          <span className="text-xs text-muted-foreground">or paste below</span>
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setRaw(await f.text());
              setResults(null);
            }}
          />
        </label>
        <textarea
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value);
            setResults(null);
          }}
          rows={8}
          placeholder="Paste CSV here…"
          className="w-full rounded-2xl border border-input bg-background px-3 py-2 font-mono text-xs"
        />
        {preview.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Preview {preview.length} row{preview.length === 1 ? "" : "s"}
            {preview.length >= 50 ? " (first 50)" : ""}
          </div>
        )}
        <button
          type="button"
          disabled={!raw.trim() || run.isPending}
          onClick={() => run.mutate()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {run.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
          Import updates
        </button>
      </div>

      {results && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3 text-sm font-bold">
            Results · {results.filter((r) => r.status === "ok").length} ok ·{" "}
            {results.filter((r) => r.status === "error").length} errors
          </div>
          <ul className="max-h-80 divide-y divide-border overflow-y-auto text-sm">
            {results.map((r) => (
              <li key={r.line} className="flex items-start gap-2 px-4 py-2">
                {r.status === "ok" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                ) : r.status === "error" ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                ) : (
                  <span className="mt-0.5 h-4 w-4 shrink-0 text-center text-muted-foreground">·</span>
                )}
                <div className="min-w-0">
                  <p className="font-medium">
                    Line {r.line}
                    {r.name ? ` · ${r.name}` : ""}
                    {r.barcode ? ` · ${r.barcode}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">{r.message}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
