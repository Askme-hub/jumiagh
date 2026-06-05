import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { z } from "zod";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/lib/products";
import { useSearchUI } from "@/lib/search-ui";
import type { Product } from "@/lib/store";

const SearchSchema = z.object({ q: z.string().optional().default("") });

export const Route = createFileRoute("/search")({
  validateSearch: (s) => SearchSchema.parse(s),
  component: SearchPage,
  head: () => ({ meta: [{ title: "Search – Kivora Ghana" }] }),
});

function SearchPage() {
  const { q } = Route.useSearch();
  const { data: products = [], isLoading } = useProducts();
  const openSearch = useSearchUI((s) => s.setOpen);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return products.filter((p: Product) => p.name.toLowerCase().includes(term));
  }, [q, products]);

  return (
    <div className="bg-background min-h-screen">
      <button
        onClick={() => openSearch(true)}
        className="w-full flex items-center gap-3 px-4 py-3 m-0 text-left"
      >
        <div className="flex-1 flex items-center gap-3 rounded-2xl border border-input bg-muted px-4 py-3">
          <Search size={18} className="text-muted-foreground" />
          <span className="text-sm font-medium text-foreground truncate">
            {q.trim() ? q : "Search on Kivora"}
          </span>
        </div>
      </button>

      <div className="px-4 pb-1 text-sm text-muted-foreground">
        {q.trim().length === 0
          ? "Tap above to search products"
          : isLoading
          ? "Searching…"
          : `${results.length} result${results.length === 1 ? "" : "s"} for "${q}"`}
      </div>

      <div className="px-3 mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 pb-6">
        {results.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {q.trim() && !isLoading && results.length === 0 && (
        <div className="px-4 py-16 text-center">
          <p className="text-sm font-semibold text-foreground">No products found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Nothing matched "{q}". Try a different keyword.
          </p>
        </div>
      )}
    </div>
  );
}
