import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Zap, Phone, ChevronRight, PackageOpen } from "lucide-react";

import { ProductCard } from "@/components/ProductCard";
import { ProductCardSkeleton, ProductGridSkeleton } from "@/components/ProductCardSkeleton";
import { EmptyState } from "@/components/EmptyState";

import { useProducts, toProduct, type DbProduct } from "@/lib/products";
import { useCategories } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/store";

import banner from "@/assets/banner-anniversary.jpg";

export const Route = createFileRoute("/")({
  component: Home,

  head: () => ({
    meta: [
      { title: "Kivora Ghana – Everything You Need" },
      {
        name: "description",
        content:
          "Shop electronics, fashion, groceries, beauty products and more on Kivora Ghana. Fast delivery, secure payments and amazing deals.",
      },
    ],
  }),
});

function Countdown() {
  const [t, setT] = useState({ h: 1, m: 17, s: 50 });

  useEffect(() => {
    const i = setInterval(() => {
      setT((p) => {
        let s = p.s - 1;
        let m = p.m;
        let h = p.h;
        if (s < 0) {
          s = 59;
          m--;
        }
        if (m < 0) {
          m = 59;
          h--;
        }
        if (h < 0) return { h: 1, m: 59, s: 59 };
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(i);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <span className="tabular-nums">
      {pad(t.h)}h : {pad(t.m)}m : {pad(t.s)}s
    </span>
  );
}

/** Fetch products grouped by their category name. */
function useGroupedProducts() {
  return useQuery({
    queryKey: ["products-grouped"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data as (DbProduct & { category: string | null })[];
      const groups = new Map<string, Product[]>();
      for (const r of rows) {
        const key = r.category ?? "Other";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(toProduct(r));
      }
      return groups;
    },
  });
}

function CategoryBand({
  title,
  products,
}: {
  title: string;
  products: Product[];
}) {
  if (products.length === 0) return null;
  return (
    <section className="mt-4">
      <div className="bg-teal text-teal-foreground px-4 py-3 flex items-center justify-between">
        <h2 className="font-bold text-base">{title}</h2>
        <Link
          to="/categories"
          className="text-sm font-semibold flex items-center gap-0.5 opacity-90 hover:opacity-100"
        >
          See All <ChevronRight size={16} />
        </Link>
      </div>
      <div className="overflow-x-auto scrollbar-none bg-card">
        <div className="flex gap-3 px-3 py-3">
          {products.slice(0, 10).map((p) => (
            <div key={p.id} className="min-w-[150px] max-w-[160px]">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Home() {
  const { data: products = [], isLoading } = useProducts();
  const { data: categories = [] } = useCategories();
  const { data: grouped } = useGroupedProducts();

  return (
    <div className="bg-background min-h-screen pb-8">
      {/* CALL TO ORDER BAR */}
      <div className="bg-primary py-2.5 text-center text-sm font-bold text-primary-foreground flex items-center justify-center gap-2">
        <Phone size={15} /> Call to Order: 025 757 3471 or 055 247 4242
      </div>

      {/* HERO */}
      <div className="px-3 pt-3">
        <div className="relative rounded-2xl overflow-hidden shadow-lg">
          <img
            src={banner}
            alt="Kivora anniversary sale banner"
            className="w-full aspect-[2/1] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent p-4 flex flex-col justify-center">
            <div className="text-white">
              <p className="text-xs font-bold tracking-[0.25em] uppercase text-primary">
                KIVORA GHANA
              </p>
              <h1 className="text-3xl font-extrabold mt-2 leading-tight">
                Everything
                <br />
                You Need
              </h1>
              <span className="inline-block mt-4 bg-primary text-primary-foreground rounded-full px-5 py-2 text-xs font-bold shadow-lg">
                UP TO 70% OFF
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CATEGORY QUICK GRID */}
      {categories.length > 0 && (
        <div className="mt-4 px-3 grid grid-cols-4 gap-3">
          {categories.slice(0, 8).map((c) => (
            <Link
              key={c.id}
              to="/categories"
              className="flex flex-col items-center gap-1.5 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary-soft overflow-hidden flex items-center justify-center">
                {c.image_url ? (
                  <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-extrabold text-primary">
                    {c.name.charAt(0)}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium text-foreground leading-tight line-clamp-2">
                {c.name}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* FLASH SALES BAND */}
      <div className="mt-4 bg-flash text-flash-foreground px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap size={22} fill="currentColor" />
          <div>
            <p className="font-extrabold text-lg leading-none">Flash Sales</p>
            <p className="text-[11px] mt-1 font-semibold">
              TIME LEFT: <Countdown />
            </p>
          </div>
        </div>
        <Link to="/categories" className="text-sm font-bold">
          See All
        </Link>
      </div>

      {/* FLASH PRODUCTS */}
      <div className="overflow-x-auto scrollbar-none bg-card">
        <div className="flex gap-3 px-3 py-3">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="min-w-[150px] max-w-[160px]">
                  <ProductCardSkeleton />
                </div>
              ))
            : products.slice(0, 8).map((p: Product) => (
                <div key={p.id} className="min-w-[150px] max-w-[160px]">
                  <ProductCard product={p} />
                </div>
              ))}
        </div>
      </div>

      {/* RECOMMENDED */}
      <section className="mt-4">
        <div className="bg-teal text-teal-foreground px-4 py-3">
          <h2 className="font-bold text-base">Recommended For You</h2>
        </div>
        {isLoading ? (
          <div className="px-3 mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-lg bg-foreground/10 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-semibold text-foreground">No products yet</p>
            <p className="text-xs text-muted-foreground mt-1">Check back soon for new arrivals.</p>
          </div>
        ) : (
          <div className="px-3 mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {products.slice(0, 12).map((p: Product) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* CATEGORY SECTIONS */}
      {grouped &&
        categories.map((c) => (
          <CategoryBand key={c.id} title={c.name} products={grouped.get(c.name) ?? []} />
        ))}
    </div>
  );
}
