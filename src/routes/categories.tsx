import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { useCategories } from "@/lib/categories";
import { useProducts } from "@/lib/products";

export const Route = createFileRoute("/categories")({
  component: Categories,
  head: () => ({ meta: [{ title: "Categories – Kivora Ghana" }] }),
});

function Categories() {
  const { data: categories = [], isLoading } = useCategories();
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    if (!active && categories.length > 0) setActive(categories[0].name);
  }, [categories, active]);

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
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-lg bg-foreground/10 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-foreground">No products yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Products in {active || "this category"} will appear here.
              </p>
            </div>
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
