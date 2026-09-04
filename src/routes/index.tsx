import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Zap, Phone, ChevronRight, PackageOpen } from "lucide-react";

import { ProductCard } from "@/components/ProductCard";
import { ProductCardSkeleton, ProductGridSkeleton } from "@/components/ProductCardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { BannerSlider } from "@/components/BannerSlider";
import { InstallAppButton } from "@/components/InstallAppButton";

import { useProducts, toProduct, type DbProduct } from "@/lib/products";
import { useCategories } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/store";


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

function SectionHead({ title, category }: { title: string; category?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 px-4">
      <h2 className="truncate text-base font-extrabold tracking-tight text-foreground">{title}</h2>
      <Link
        to="/categories"
        search={category ? { c: category } : {}}
        className="flex shrink-0 items-center gap-0.5 text-xs font-bold text-primary"
      >
        View All <ChevronRight size={14} />
      </Link>
    </div>
  );
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
    <section className="mt-7">
      <SectionHead title={title} category={title} />
      <div className="overflow-x-auto scrollbar-none">
        <div className="flex gap-3 px-4 pb-2">
          {products.slice(0, 10).map((p) => (
            <div key={p.id} className="min-w-[160px] max-w-[170px]">
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
    <div className="min-h-screen bg-background pb-10">
      <h1 className="sr-only">Kivora Ghana — shop electronics, fashion, groceries and more</h1>

      {/* HERO / BANNER SLIDER */}
      <BannerSlider />

      <div className="px-4 mt-4">
        <InstallAppButton />
      </div>

      {/* CATEGORY CIRCLES */}
      {categories.length > 0 && (
        <div className="mt-5 overflow-x-auto scrollbar-none">
          <div className="flex gap-4 px-4">
            {categories.slice(0, 10).map((c) => (
              <Link
                key={c.id}
                to="/categories"
                className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center"
              >
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-transparent bg-card shadow-soft transition hover:border-primary">
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" />
                  ) : (
                    <PackageOpen size={22} className="text-primary" />
                  )}
                </div>
                <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-foreground">
                  {c.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* FLASH SALES */}
      <section className="mt-7">
        <div className="px-4">
          <div className="flex items-center justify-between gap-3 rounded-3xl bg-flash px-4 py-3 text-flash-foreground shadow-soft">
            <div className="flex min-w-0 items-center gap-3">
              <Zap size={20} fill="currentColor" className="shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-extrabold leading-none">Flash Sales</p>
                <p className="mt-1 text-[11px] font-semibold opacity-90">
                  <Countdown />
                </p>
              </div>
            </div>
            <Link to="/categories" className="shrink-0 text-xs font-bold">
              View All
            </Link>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto scrollbar-none">
          <div className="flex gap-3 px-4 pb-2">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="min-w-[160px] max-w-[170px]">
                    <ProductCardSkeleton />
                  </div>
                ))
              : products.slice(0, 8).map((p: Product) => (
                  <div key={p.id} className="min-w-[160px] max-w-[170px]">
                    <ProductCard product={p} />
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* CALL TO ORDER */}
      <div className="mt-6 px-4">
        <a
          href="tel:0257573471"
          className="flex items-center gap-3 rounded-3xl bg-primary-soft px-4 py-3.5 shadow-soft"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-primary text-primary-foreground">
            <Phone size={17} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-extrabold text-foreground">Call to order</span>
            <span className="block truncate text-xs text-muted-foreground">
              025 757 3471 · 055 247 4242
            </span>
          </span>
        </a>
      </div>

      {/* RECOMMENDED */}
      <section className="mt-7">
        <SectionHead title="Recommended For You" />
        {isLoading ? (
          <div className="px-4">
            <ProductGridSkeleton count={10} />
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={PackageOpen}
            title="No products yet"
            description="Check back soon for new arrivals and amazing deals."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 px-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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

