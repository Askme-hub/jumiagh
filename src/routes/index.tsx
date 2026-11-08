import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Zap, Phone, ChevronRight, PackageOpen, Truck } from "lucide-react";

import { ProductCard } from "@/components/ProductCard";
import { ProductCardSkeleton, ProductGridSkeleton } from "@/components/ProductCardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { BannerSlider } from "@/components/BannerSlider";
import { InstallAppButton } from "@/components/InstallAppButton";

import { useProducts, toProduct, type DbProduct } from "@/lib/products";
import { useCategories } from "@/lib/categories";
import { useActiveFlashSale, flashPriceMap } from "@/lib/flash-sales";
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
      { property: "og:title", content: "Kivora Ghana – Everything You Need" },
      { property: "og:description", content: "Shop electronics, fashion, groceries, beauty and more on Kivora Ghana with fast delivery and secure payments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Countdown({ to }: { to?: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  if (now === null) return <span className="tabular-nums">--:--:--</span>;

  const target = to ? new Date(to).getTime() : now + 3600_000;
  const diff = Math.max(0, target - now);
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <span className="tabular-nums">
      {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}

/** Fetch products grouped by their category name. */
function useGroupedProducts() {
  const { data: products } = useProducts();
  const data = useMemo(() => {
    if (!products) return undefined;
    const groups = new Map<string, Product[]>();
    for (const p of products) {
      const key = p.category ?? "Other";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    return groups;
  }, [products]);
  return { data };
}

function SectionHead({ title, category }: { title: string; category?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 px-4">
      <h2 className="truncate text-xl font-bold tracking-tight text-foreground md:text-3xl">{title}</h2>
      <SeeAll category={category} />
    </div>
  );
}

function SeeAll({ category }: { category?: string }) {
  return (
    <Link
      to="/categories"
      search={category ? { c: category } : ({} as { c?: string })}
      className="flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:opacity-90 md:text-sm"
    >
      See All
      <ChevronRight size={15} />
    </Link>
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
  const { data: flashSale } = useActiveFlashSale();

  // Products in the live flash sale, with their sale price applied
  const flashMap = flashPriceMap(flashSale);
  const flashProducts: Product[] = flashSale
    ? products
        .filter((p) => flashMap.has(p.id))
        .map((p) => {
          const sp = flashMap.get(p.id)!;
          return {
            ...p,
            oldPrice: p.price,
            price: sp,
            discount: p.price > 0 ? Math.round(((p.price - sp) / p.price) * 100) : undefined,
          };
        })
    : [];
  const displayFlash = flashProducts.length > 0 ? flashProducts : products.slice(0, 8);

  return (
    <div className="min-h-screen bg-background pb-10">
      <h1 className="sr-only">Kivora Ghana — shop electronics, fashion, groceries and more</h1>

      {/* HERO / BANNER SLIDER */}
      <BannerSlider />

      <div className="px-4 mt-4">
        <InstallAppButton />
      </div>

      {/* DELIVERY PROMO PILL */}
      <div className="mt-4 px-4">
        <Link
          to="/shipping"
          className="flex items-center justify-between gap-3 rounded-2xl bg-primary-soft px-4 py-3"
        >
          <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-foreground">
            Delivery across
            <span className="rounded-full bg-card px-2 py-0.5 text-xs font-bold text-primary">all 16 regions</span>
            of Ghana
          </span>
          <Truck size={20} className="shrink-0 text-primary" />
        </Link>
      </div>

      {/* CATEGORY CIRCLES */}
      {categories.length > 0 && (
        <section className="mt-7">
        <div className="mb-3 flex items-center justify-between gap-3 px-4">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Categories</h2>
          <SeeAll />
        </div>
        <div className="overflow-x-auto scrollbar-none">
          <div className="flex gap-3 px-4">
            {categories.slice(0, 10).map((c) => (
              <Link
                key={c.id}
                to="/categories"
                search={{ c: c.name }}
                className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center"
              >
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-transparent bg-muted transition hover:border-primary">
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
        </section>
      )}

      {/* FLASH SALES */}
      <section id="flash-sales" className="mt-7 scroll-mt-20">
        <div className="flex items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-xl font-bold tracking-tight text-foreground">
              {flashSale?.title ?? "Flash Sale"}
            </h2>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-flash px-1.5 py-0.5 text-[11px] font-bold text-flash-foreground">
              <Zap size={11} fill="currentColor" />
              <Countdown to={flashSale?.ends_at} />
            </span>
          </div>
          <SeeAll />
        </div>

        <div className="mt-3 overflow-x-auto scrollbar-none">
          <div className="flex gap-3 px-4 pb-2">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="min-w-[160px] max-w-[170px]">
                    <ProductCardSkeleton />
                  </div>
                ))
              : displayFlash.map((p: Product) => (
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
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 px-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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

