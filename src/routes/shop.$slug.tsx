import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BadgeCheck, MapPin, Phone, Search, Store, PackageOpen, Star, ShieldAlert,
} from "lucide-react";
import { fetchPublicStore } from "@/lib/stores.functions";
import { useStoreProducts } from "@/lib/stores";
import { ProductCard } from "@/components/ProductCard";
import { ProductCardSkeleton } from "@/components/ProductCardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ShareStore } from "@/components/ShareStore";

const SITE = "https://kivoragh.lovable.app";

export const Route = createFileRoute("/shop/$slug")({
  loader: ({ params }) => fetchPublicStore({ data: { slug: params.slug } }),
  head: ({ params, loaderData }) => {
    const store = loaderData as { shop_name?: string; bio?: string | null; banner_url?: string | null } | null;
    if (!store?.shop_name) {
      return {
        meta: [
          { title: "Store not available — Kivora Ghana" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `${store.shop_name} — Kivora Ghana`;
    const description = store.bio?.slice(0, 155) || `Shop ${store.shop_name} on Kivora Ghana.`;
    const url = `${SITE}/shop/${params.slug}`;
    const image =
      store.banner_url && /^https:\/\//.test(store.banner_url) ? store.banner_url : null;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
        { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: StorePage,
  errorComponent: () => <StoreMissing message="We couldn't load this store right now." />,
  notFoundComponent: () => <StoreMissing message="This store doesn't exist." />,
});

function StoreMissing({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <ShieldAlert className="mx-auto mb-3 text-muted-foreground" size={40} />
      <h1 className="text-lg font-bold text-foreground">Store unavailable</h1>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      <Link to="/" className="mt-5 inline-block rounded-full gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
        Back to Kivora
      </Link>
    </div>
  );
}

function StorePage() {
  const store = Route.useLoaderData();
  const { slug } = Route.useParams();
  const { data: products, isLoading } = useStoreProducts(store?.user_id);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  const categories = useMemo(
    () => Array.from(new Set((products ?? []).map((p) => p.category).filter(Boolean))) as string[],
    [products],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (products ?? []).filter(
      (p) =>
        (!cat || p.category === cat) &&
        (!term || p.name.toLowerCase().includes(term) || (p.description ?? "").toLowerCase().includes(term)),
    );
  }, [products, q, cat]);

  if (!store) return <StoreMissing message="This store is not available. It may be pending approval or suspended." />;

  const url = `${SITE}/shop/${slug}`;
  const phone = store.whatsapp_number?.replace(/[^\d]/g, "");
  const waNumber = phone ? (phone.startsWith("0") ? `233${phone.slice(1)}` : phone) : null;
  const count = store.product_count ?? products?.length ?? 0;

  return (
    <div className="pb-10">
      {/* COVER */}
      <div className="relative h-36 w-full overflow-hidden bg-primary-soft sm:h-52">
        {store.banner_url ? (
          <img src={store.banner_url} alt={`${store.shop_name} cover`} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full gradient-primary" />
        )}
      </div>

      <div className="mx-auto max-w-5xl px-4">
        {/* HEADER CARD */}
        <div className="-mt-10 rounded-3xl border border-border/60 bg-card p-4 shadow-soft">
          <div className="flex items-start gap-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-card bg-muted shadow-soft">
              {store.logo_url ? (
                <img src={store.logo_url} alt={store.shop_name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-primary">
                  <Store size={24} />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h1 className="truncate text-lg font-extrabold text-foreground">{store.shop_name}</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                  <BadgeCheck size={12} /> Kivora Verified
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-semibold text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" /> Open
                </span>
                {store.business_category && (
                  <span className="rounded-full bg-muted px-2 py-0.5 font-semibold uppercase">{store.business_category}</span>
                )}
                {store.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} /> {store.location}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Star size={12} className="text-warning" fill="currentColor" strokeWidth={0} /> New seller
                </span>
                <span className="inline-flex items-center gap-1">
                  <PackageOpen size={12} /> {count} product{count === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </div>

          {store.bio && <p className="mt-3 text-sm leading-5 text-muted-foreground">{store.bio}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            <ShareStore shopName={store.shop_name} url={url} />
            {waNumber && (
              <a
                href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Hello ${store.shop_name}, I found your store on Kivora Ghana.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/10 px-4 py-2.5 text-sm font-bold text-success"
              >
                WhatsApp
              </a>
            )}
            {store.whatsapp_number && (
              <a
                href={`tel:${store.whatsapp_number}`}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-bold text-foreground"
              >
                <Phone size={16} /> Call
              </a>
            )}
          </div>
        </div>

        {/* SEARCH + FILTERS */}
        <div className="mt-5">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search in ${store.shop_name}`}
              className="w-full rounded-full border border-border bg-card py-3 pl-10 pr-4 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          {categories.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => setCat(null)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                  !cat ? "gradient-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"
                }`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c === cat ? null : c)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                    cat === c ? "gradient-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* PRODUCTS */}
        <div className="mt-5">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={PackageOpen}
              title={products && products.length > 0 ? "No matching products" : "No products yet"}
              description={
                products && products.length > 0
                  ? "Try a different search or category."
                  : `${store.shop_name} hasn't listed any products yet. Check back soon.`
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
