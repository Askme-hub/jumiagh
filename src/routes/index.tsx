import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Zap, Phone, ChevronRight, PackageOpen, Truck, ShieldCheck, BadgeCheck, CreditCard, Headphones, ArrowRight } from "lucide-react";

import { ProductCard } from "@/components/ProductCard";
import { ProductCardSkeleton, ProductGridSkeleton } from "@/components/ProductCardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { BannerSlider } from "@/components/BannerSlider";
import { InstallAppButton } from "@/components/InstallAppButton";

import { useProducts } from "@/lib/products";
import { useCategories } from "@/lib/categories";
import { useActiveFlashSale, flashPriceMap } from "@/lib/flash-sales";
import type { Product } from "@/lib/store";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Kivora Ghana – Everything You Need" },
      { name: "description", content: "Shop electronics, fashion, groceries, beauty products and more on Kivora Ghana. Fast delivery, secure payments and amazing deals." },
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
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  if (now === null) return <span className="tabular-nums">--:--:--</span>;
  const target = to ? new Date(to).getTime() : now + 3600_000;
  const diff = Math.max(0, target - now);
  const pad = (n: number) => String(n).padStart(2, "0");
  return <span className="tabular-nums">{pad(Math.floor(diff / 3_600_000))}:{pad(Math.floor((diff % 3_600_000) / 60_000))}:{pad(Math.floor((diff % 60_000) / 1000))}</span>;
}

function useGroupedProducts() {
  const { data: products } = useProducts();
  const data = useMemo(() => {
    if (!products) return undefined;
    const groups = new Map<string, Product[]>();
    for (const product of products) {
      const key = product.category ?? "Other";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(product);
    }
    return groups;
  }, [products]);
  return { data };
}

function SectionHead({ title, category, eyebrow }: { title: string; category?: string; eyebrow?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3 px-4 md:px-0">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-primary md:text-xs">{eyebrow}</p>}
        <h2 className="truncate font-display text-xl font-bold tracking-tight text-foreground md:text-2xl">{title}</h2>
      </div>
      <Link to="/categories" search={category ? { c: category } : ({} as { c?: string })} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground transition hover:border-primary hover:text-primary md:px-4 md:text-sm">
        See all <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function CategoryBand({ title, products }: { title: string; products: Product[] }) {
  if (!products.length) return null;
  return (
    <section className="home-section mt-9 md:mt-12">
      <SectionHead title={title} category={title} eyebrow="Explore by category" />
      <div className="overflow-x-auto scrollbar-none">
        <div className="flex gap-3 px-4 pb-2 md:px-0">
          {products.slice(0, 10).map((product) => <div key={product.id} className="w-[156px] shrink-0 sm:w-[180px]"><ProductCard product={product} /></div>)}
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

  const flashMap = flashPriceMap(flashSale);
  const flashProducts: Product[] = flashSale ? products.filter((p) => flashMap.has(p.id)).map((p) => {
    const salePrice = flashMap.get(p.id)!;
    return { ...p, oldPrice: p.price, price: salePrice, discount: p.price > 0 ? Math.round(((p.price - salePrice) / p.price) * 100) : undefined };
  }) : [];
  const displayFlash = flashProducts.length > 0 ? flashProducts : products.slice(0, 8);

  return (
    <div className="home-page min-h-screen pb-12">
      <h1 className="sr-only">Kivora Ghana — shop electronics, fashion, groceries and more</h1>

      {/* Trust / service strip */}
      <div className="home-trust-strip mx-4 mt-3 hidden items-center justify-between rounded-xl border border-border/70 bg-card px-4 py-2.5 text-xs text-muted-foreground md:flex lg:mx-0">
        <span className="flex items-center gap-2"><Truck size={15} className="text-primary" /> Delivery across all 16 regions</span>
        <span className="flex items-center gap-2"><ShieldCheck size={15} className="text-primary" /> Secure shopping</span>
        <span className="flex items-center gap-2"><BadgeCheck size={15} className="text-primary" /> Trusted local sellers</span>
        <span className="flex items-center gap-2"><Headphones size={15} className="text-primary" /> Customer support</span>
      </div>

      {/* Main promotion banner */}
      <section className="home-hero mt-3 md:mt-5">
        <BannerSlider />
      </section>

      <div className="mx-4 mt-3 md:hidden"><InstallAppButton /></div>

      {/* Delivery callout */}
      <div className="mx-4 mt-4 md:mx-0 md:mt-5">
        <Link to="/shipping" className="group flex items-center justify-between gap-3 rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3.5 transition hover:border-primary/30 md:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft"><Truck size={19} /></span>
            <span><span className="block text-sm font-extrabold text-foreground">We deliver nationwide</span><span className="block text-xs text-muted-foreground">Shop from anywhere in Ghana · Delivery to all 16 regions</span></span>
          </div>
          <ChevronRight size={18} className="shrink-0 text-primary transition group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Categories */}
      {categories.length > 0 && <section className="home-section mt-8 md:mt-10">
        <SectionHead title="Shop by category" eyebrow="Find what you need" />
        <div className="overflow-x-auto scrollbar-none">
          <div className="flex gap-3 px-4 md:grid md:grid-cols-5 md:gap-4 md:px-0 lg:grid-cols-8">
            {categories.slice(0, 10).map((category) => <Link key={category.id} to="/categories" search={{ c: category.name }} className="group flex w-[78px] shrink-0 flex-col items-center gap-2 rounded-2xl p-1 text-center transition hover:-translate-y-1 md:w-auto md:rounded-2xl md:border md:border-border/70 md:bg-card md:p-3 md:hover:border-primary/40 md:hover:shadow-soft">
              <div className="flex h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-2xl bg-muted ring-1 ring-border/50 transition group-hover:ring-primary/50 md:h-[76px] md:w-[76px] md:rounded-xl">
                {category.image_url ? <img src={category.image_url} alt={category.name} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /> : <PackageOpen size={24} className="text-primary" />}
              </div>
              <span className="line-clamp-2 text-[11px] font-bold leading-tight text-foreground md:text-xs">{category.name}</span>
            </Link>)}
          </div>
        </div>
      </section>}

      {/* Flash sale */}
      <section id="flash-sales" className="home-flash-section mx-4 mt-8 overflow-hidden rounded-2xl border border-flash/15 bg-card shadow-soft scroll-mt-20 md:mx-0 md:mt-10 md:rounded-3xl">
        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-flash/10 via-flash/5 to-transparent px-4 py-4 md:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-flash text-flash-foreground"><Zap size={18} fill="currentColor" /></span>
            <div className="min-w-0"><h2 className="truncate font-display text-lg font-extrabold text-foreground md:text-xl">{flashSale?.title ?? "Flash deals"}</h2><p className="text-[11px] text-muted-foreground">Limited-time prices. Grab them before they’re gone.</p></div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-flash px-2.5 py-1.5 text-xs font-extrabold text-flash-foreground"><span className="hidden sm:inline">Ends in</span><Countdown to={flashSale?.ends_at} /></span>
        </div>
        <div className="overflow-x-auto scrollbar-none"><div className="flex gap-3 px-4 pb-4 pt-2 md:px-5">
          {isLoading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="w-[156px] shrink-0 sm:w-[180px]"><ProductCardSkeleton /></div>) : displayFlash.map((product: Product) => <div key={product.id} className="w-[156px] shrink-0 sm:w-[180px]"><ProductCard product={product} /></div>)}
        </div></div>
      </section>

      {/* Customer support */}
      <div className="mx-4 mt-5 md:mx-0">
        <a href="tel:0257573471" className="group flex items-center justify-between gap-3 rounded-2xl bg-foreground px-4 py-3.5 text-background transition hover:opacity-95 md:px-5">
          <span className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Phone size={17} /></span><span className="min-w-0"><span className="block text-sm font-extrabold">Need help placing an order?</span><span className="block truncate text-xs text-background/70">Call 025 757 3471 · 055 247 4242</span></span></span><span className="flex shrink-0 items-center gap-1 text-xs font-bold text-primary">Call us <ArrowRight size={15} /></span>
        </a>
      </div>

      {/* Recommended products */}
      <section className="home-section mt-9 md:mt-12">
        <SectionHead title="Recommended for you" eyebrow="Handpicked for your shopping" />
        {isLoading ? <div className="px-4 md:px-0"><ProductGridSkeleton count={10} /></div> : products.length === 0 ? <EmptyState icon={PackageOpen} title="No products yet" description="Check back soon for new arrivals and amazing deals." /> : <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 md:grid-cols-4 md:gap-4 md:px-0 lg:grid-cols-5 xl:grid-cols-6">{products.slice(0, 12).map((product: Product) => <ProductCard key={product.id} product={product} />)}</div>}
      </section>

      {/* Category product shelves */}
      {grouped && categories.map((category) => <CategoryBand key={category.id} title={category.name} products={grouped.get(category.name) ?? []} />)}

      {/* Marketplace reassurance */}
      <section className="mx-4 mt-10 grid gap-3 md:mx-0 md:grid-cols-3 md:gap-4">
        {[{ icon: Truck, title: "Delivery made simple", desc: "Get your orders delivered across Ghana." }, { icon: ShieldCheck, title: "Shop with confidence", desc: "A smoother, safer marketplace experience." }, { icon: CreditCard, title: "Convenient checkout", desc: "Easy checkout options for your purchases." }].map((item) => <div key={item.title} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><item.icon size={19} /></span><div><h3 className="text-sm font-extrabold text-foreground">{item.title}</h3><p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p></div></div>)}
      </section>
    </div>
  );
}
