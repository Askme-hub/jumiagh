import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = "https://kivoragh.shop";
const STATIC_PATHS = ["/", "/categories", "/search", "/help", "/terms", "/privacy", "/returns", "/shipping"];

const esc = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { createClient } = await import("@supabase/supabase-js");
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const supabase = createClient(process.env["SUPABASE_URL"]!, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const paths = [...STATIC_PATHS];

        const pageSize = 1000;
        for (let offset = 0; ; ) {
          const { data, error } = await supabase
            .from("products")
            .select("id")
            .eq("approval_status", "approved")
            .order("id")
            .range(offset, offset + pageSize - 1);
          if (error) return new Response("Sitemap unavailable", { status: 500 });
          if (!data.length) break;
          for (const r of data) paths.push(`/products/${encodeURIComponent(r.id)}`);
          offset += data.length;
        }

        const { data: stores, error: sErr } = await (supabase as any).rpc("public_stores");
        if (sErr) return new Response("Sitemap unavailable", { status: 500 });
        for (const s of (stores ?? []) as { slug?: string | null }[]) {
          if (s.slug) paths.push(`/shop/${encodeURIComponent(s.slug)}`);
        }

        const urls = [...new Set(paths)].map((p) => `<url><loc>${esc(BASE_URL + p)}</loc></url>`).join("");
        const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
