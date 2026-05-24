import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { z } from "zod";
import { SearchBar } from "@/components/SearchBar";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/lib/products";
import type { Product } from "@/lib/store";

const SearchSchema = z.object({ q: z.string().optional().default("") });

export const Route = createFileRoute("/search")({
  validateSearch: (s) => SearchSchema.parse(s),
  component: SearchPage,
  head: () => ({ meta: [{ title: "Search – Jumia Ghana" }] }),
});

function SearchPage() {
  const { q } = Route.useSearch();
  const { data: products = [], isLoading } = useProducts();

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return products.filter((p: Product) => p.name.toLowerCase().includes(term));
  }, [q, products]);

  return (
    <div className="bg-[#f5f5f5] min-h-screen">
      <SearchBar back />
      <div className="px-4 py-2 text-sm text-muted-foreground">
        {q.trim().length === 0
          ? "Start typing to search products"
          : isLoading
          ? "Searching…"
          : `${results.length} result${results.length === 1 ? "" : "s"} for "${q}"`}
      </div>
      <div className="px-3 mt-2 grid grid-cols-2 gap-3 pb-6">
        {results.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      {q.trim() && !isLoading && results.length === 0 && (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          No products matched "{q}". Try a different keyword.
        </div>
      )}
    </div>
  );
}
