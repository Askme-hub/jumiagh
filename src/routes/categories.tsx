import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PackageOpen } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { ProductCardSkeleton } from "@/components/ProductCardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { useCategories } from "@/lib/categories";
import { useProducts } from "@/lib/products";

export const Route = createFileRoute("/categories")({
  component: Categories,
  validateSearch: (search: Record<string, unknown>): { c?: string } =>
    typeof search.c === "string" && search.c ? { c: search.c } : {},
  head: () => ({
    meta: [
      { title: "Shop by Category – Kivora Ghana" },
      {
        name: "description",
        content:
          "Browse Kivora Ghana by category — electronics, fashion, groceries, beauty and more, with fast delivery across Ghana.",
      },
      { property: "og:title", content: "Shop by Category – Kivora Ghana" },
      {
        property: "og:description",
        content: "Find exactly what you need on Kivora Ghana, category by category.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Categories() {
  const { data: categories = [], isLoading } = useCategories();
  const navigate = Route.useNavigate();
  const { c } = Route.useSearch();
  const [fallback, setFallback] = useState<string>("");
  const active = c ?? fallback;

  const setActive = (name: string) => {
    setFallback(name);
    navigate({ search: { c: name }, replace: true });
  };

  useEffect(() => {
    if (!c && !fallback && categories.length > 0) setFallback(categories[0].name);
  }, [categories, c, fallback]);

  const { data: products = [], isLoading: loadingProducts } = useProducts(active || undefined);

  return (
    <div>
      <div className="flex border-t border-border" style={{ minHeight: "calc(100vh - 130px)" }}>
        <aside className="w-28 bg-muted shrink-0">
          {isLoading ? (
            <div className="p-3 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-4 rounded bg-foreground/10 animate-pulse" />
              ))}
            </div>
          ) : (
            categories.map((c) => {
              const isActive = c.name === active;
              return (
                <button
                  key={c.id}
                  onClick={() => setActive(c.name)}
                  className={`w-full text-left text-xs px-3 py-4 leading-tight border-l-[3px] transition ${
                    isActive
                      ? "bg-background border-primary font-semibold text-foreground"
                      : "border-transparent text-foreground/70 hover:bg-background/60"
                  }`}
                >
                  {c.name}
                </button>
              );
            })
          )}
        </aside>

        <div className="flex-1 p-3 bg-muted/40">
          <div className="bg-card rounded-md px-4 py-3 mb-3 flex items-center justify-between border border-border">
            <p className="font-semibold text-foreground">{active || "All Products"}</p>
            <span className="text-xs text-muted-foreground">
              {loadingProducts ? "Loading…" : `${products.length} item${products.length === 1 ? "" : "s"}`}
            </span>
          </div>

          {loadingProducts ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              icon={PackageOpen}
              title="No products yet"
              description={`Products in ${active || "this category"} will appear here soon.`}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
