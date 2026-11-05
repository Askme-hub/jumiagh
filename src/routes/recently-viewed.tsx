import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { ProductCard } from "@/components/ProductCard";
import { toProduct, type DbProduct } from "@/lib/products";
import { clearRecentlyViewed, getRecentlyViewed } from "@/lib/recently-viewed";

export const Route = createFileRoute("/recently-viewed")({
  component: RecentlyViewed,
  head: () => ({
    meta: [
      { title: "Recently Viewed – Kivora Ghana" },
      { name: "description", content: "Products you looked at recently on Kivora Ghana." },
      { property: "og:title", content: "Recently Viewed – Kivora Ghana" },
      { property: "og:description", content: "Products you looked at recently on Kivora Ghana." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function RecentlyViewed() {
  const [ids, setIds] = useState<string[] | null>(null);
  useEffect(() => setIds(getRecentlyViewed()), []);
  const { data = [], isLoading } = useQuery({
    queryKey: ["recently-viewed", ids],
    enabled: !!ids && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").in("id", ids!).eq("approval_status", "approved");
      if (error) throw error;
      const map = new Map((data as DbProduct[]).map((p) => [p.id, toProduct(p)]));
      return ids!.map((id) => map.get(id)).filter(Boolean) as ReturnType<typeof toProduct>[];
    },
  });

  return (
    <div className="pb-10">
      <PageHeader title="Recently Viewed" />
      <div className="max-w-5xl mx-auto p-4">
        {ids && ids.length > 0 && (
          <div className="mb-3 flex justify-end">
            <button onClick={() => { clearRecentlyViewed(); setIds([]); }} className="text-xs font-semibold text-primary">Clear history</button>
          </div>
        )}
        {ids && ids.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">Products you open will show up here.</p>
            <Link to="/" className="mt-4 inline-block rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground">Start shopping</Link>
          </div>
        )}
        {isLoading && ids && ids.length > 0 && <p className="text-sm text-muted-foreground">Loading…</p>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {data.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </div>
  );
}
