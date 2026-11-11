import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  MapPin,
  Phone,
  Search,
  Store,
  PackageOpen,
  Star,
  ShieldAlert,
  Ticket,
  QrCode,
  CalendarDays,
  Truck,
  MessageCircle,
  ArrowUpDown,
  BadgeCheck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSellerReviews, useSellerRating } from "@/lib/reviews";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ShopCardStudio } from "@/components/ShopCardStudio";
import { fetchPublicStore } from "@/lib/stores.functions";
import { useStoreProducts } from "@/lib/stores";
import { StarRating } from "@/components/StarRating";
import { ProductCard } from "@/components/ProductCard";
import { ProductCardSkeleton } from "@/components/ProductCardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ShareStore } from "@/components/ShareStore";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { MessageSellerButton } from "@/components/MessageSellerButton";

const SITE = "https://kivoragh.shop";

type SortKey = "newest" | "price-asc" | "price-desc" | "name";

export const Route = createFileRoute("/shop/$slug")({
  loader: ({ params }) => fetchPublicStore({ data: { slug: params.slug } }),
  head: ({ params, loaderData }) => {
    const store = loaderData as {
      shop_name?: string;
      bio?: string | null;
      banner_url?: string | null;
    } | null;
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
      <Link
        to="/"
        className="mt-5 inline-block rounded-full gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
      >
        Back to Kivora
      </Link>
    </div>
  );
}

function StorePage() {
  const store = Route.useLoaderData();
  const { slug } = Route.useParams();
  const { data: products, isLoading } = useStoreProducts(store?.user_id);
  const { data: rating } = useSellerRating(store?.user_id);
  const { data: reviews } = useSellerReviews(store?.user_id);

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("newest");
  const [tab, setTab] = useState<"products" | "reviews" | "about">("products");

  const { data: vouchers } = useQuery({
    queryKey: ["public-vouchers"],
    queryFn: async () => (await supabase.rpc("public_vouchers")).data ?? [],
  });
  const deals = (vouchers ?? []).filter(
    (v: { shop_name?: string }) => v.shop_name && v.shop_name === store?.shop_name,
  );

  const categories = useMemo(
    () =>
      Array.from(
        new Set((products ?? []).map((p) => p.category).filter(Boolean)),
      ) as string[],
    [products],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = (products ?? []).filter(
      (p) =>
        (!cat || p.category === cat) &&
        (!term ||
          p.name.toLowerCase().includes(term) ||
          (p.description ?? "").toLowerCase().includes(term)),
    );

    switch (sort) {
      case "price-asc":
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case "name":
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }
    return list;
  }, [products, q, cat, sort]);

  if (!store) {
    return (
      <StoreMissing message="This store is not available. It may be pending approval or suspended." />
    );
  }

  const url = `${SITE}/shop/${slug}`;
  const phone = store.whatsapp_number?.replace(/[^\d]/g, "");
  const waNumber = phone
    ? phone.startsWith("0")
      ? `233${phone.slice(1)}`
      : phone
    : null;
  const count = store.product_count ?? products?.length ?? 0;
  const since = new Date(store.created_at).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
  const isVerified =
    store.verification_status === "verified" || store.status === "approved";

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-12">
      {/* HERO / COVER */}
      <div className="relative h-40 w-full overflow-hidden sm:h-56 md:h-64">
        {store.banner_url ? (
          <img
            src={store.banner_url}
            alt={`${store.shop_name} cover`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full gradient-primary" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-6xl px-3 sm:px-4">
        {/* STORE IDENTITY CARD */}
        <div className="-mt-14 rounded-3xl border border-border/60 bg-card p-4 shadow-soft sm:-mt-16 sm:p-5 md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
            <div className="mx-auto h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-card bg-muted shadow-md sm:mx-0 sm:h-24 sm:w-24">
              {store.logo_url ? (
                <img
                  src={store.logo_url}
                  alt={store.shop_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-primary">
                  <Store size={32} />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                  {store.shop_name}
                </h1>
                {isVerified && <VerifiedBadge explainable />}
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground sm:justify-start">
                <span className="inline-flex items-center gap-1.5 font-semibold text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  Open
                </span>
                {store.business_category && (
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                    {store.business_category}
                  </span>
                )}
                {store.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={13} className="text-primary" />
                    {store.location}
                  </span>
                )}
                {rating ? (
                  <span className="inline-flex items-center gap-1">
                    <StarRating value={rating.avg} size={12} />
                    <span className="font-semibold text-foreground">{rating.avg}</span>
                    <span>· {rating.count} review{rating.count === 1 ? "" : "s"}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Star size={13} className="text-muted-foreground" />
                    New seller
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <PackageOpen size={13} />
                  {count} product{count === 1 ? "" : "s"}
                </span>
              </div>

              {store.bio && (
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground sm:line-clamp-2">
                  {store.bio}
                </p>
              )}

              <div className="mt-4 hidden flex-wrap gap-2 sm:flex">
                <MessageSellerButton
                  sellerId={store.user_id}
                  className="inline-flex items-center gap-2 rounded-full gradient-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm"
                  label="Message seller"
                />
                {waNumber && (
                  <a
                    href={`https://wa.me/${waNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted"
                  >
                    <Phone size={16} />
                    WhatsApp
                  </a>
                )}
                <ShareStore shopName={store.shop_name} url={url} />
                <Dialog>
                  <DialogTrigger className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted">
                    <QrCode size={16} />
                    Shop card
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogTitle>{store.shop_name} shop card</DialogTitle>
                    <ShopCardStudio
                      shop={{
                        shop_name: store.shop_name,
                        slug: store.slug,
                        logo_url: store.logo_url,
                        location: store.location,
                        whatsapp_number: store.whatsapp_number,
                        business_category: store.business_category,
                        verified: isVerified,
                      }}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 sm:hidden">
            <MessageSellerButton
              sellerId={store.user_id}
              className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-primary/10 py-2.5 text-[11px] font-bold text-primary"
              label="Chat"
            />
            {waNumber ? (
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 rounded-2xl bg-success/10 py-2.5 text-[11px] font-bold text-success"
              >
                <Phone size={18} />
                Call
              </a>
            ) : (
              <div className="flex flex-col items-center gap-1 rounded-2xl bg-muted py-2.5 text-[11px] font-bold text-muted-foreground opacity-50">
                <Phone size={18} />
                Call
              </div>
            )}
            <div className="flex flex-col items-center justify-center rounded-2xl bg-muted/80 py-2.5">
              <ShareStore shopName={store.shop_name} url={url} />
            </div>
            <Dialog>
              <DialogTrigger className="flex flex-col items-center gap-1 rounded-2xl bg-muted/80 py-2.5 text-[11px] font-bold text-foreground">
                <QrCode size={18} />
                Card
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogTitle>{store.shop_name} shop card</DialogTitle>
                <ShopCardStudio
                  shop={{
                    shop_name: store.shop_name,
                    slug: store.slug,
                    logo_url: store.logo_url,
                    location: store.location,
                    whatsapp_number: store.whatsapp_number,
                    business_category: store.business_category,
                    verified: isVerified,
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {deals.length > 0 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {deals.map((d: any) => (
              <button
                key={d.code}
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(d.code);
                  toast.success(`Copied code ${d.code}`);
                }}
                className="flex shrink-0 items-center gap-3 rounded-2xl border border-dashed border-primary/50 bg-primary-soft px-4 py-2.5 text-left transition active:scale-[0.98]"
              >
                <Ticket size={18} className="shrink-0 text-primary" />
                <span>
                  <span className="block text-sm font-extrabold text-foreground">
                    {d.discount_type === "percent"
                      ? `${d.value}% off`
                      : `GH₵ ${d.value} off`}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    Code <b className="text-primary">{d.code}</b>
                    {Number(d.min_spend) > 0 ? ` · min GH₵ ${d.min_spend}` : ""} ·
                    tap to copy
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="sticky top-0 z-20 -mx-3 mt-5 border-b border-border/60 bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-4 sm:px-4">
          <div className="flex gap-1 rounded-full border border-border bg-card p-1">
            {(
              [
                ["products", `Products (${count})`],
                ["reviews", `Reviews${rating ? ` (${rating.count})` : ""}`],
                ["about", "About"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`flex-1 rounded-full px-3 py-2.5 text-xs font-bold transition sm:text-sm ${
                  tab === k
                    ? "gradient-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === "products" && (
          <div className="mt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={`Search in ${store.shop_name}`}
                  className="w-full rounded-full border border-border bg-card py-3 pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown size={14} className="text-muted-foreground" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="rounded-full border border-border bg-card px-3 py-2.5 text-xs font-semibold text-foreground outline-none focus:border-primary"
                >
                  <option value="newest">Newest</option>
                  <option value="price-asc">Price: Low → High</option>
                  <option value="price-desc">Price: High → Low</option>
                  <option value="name">Name A–Z</option>
                </select>
              </div>
            </div>

            {categories.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={() => setCat(null)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                    !cat
                      ? "gradient-primary text-primary-foreground"
                      : "border border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  All
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCat(c === cat ? null : c)}
                    className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                      cat === c
                        ? "gradient-primary text-primary-foreground"
                        : "border border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-5">
              {isLoading ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={PackageOpen}
                  title={
                    products && products.length > 0
                      ? "No matching products"
                      : "No products yet"
                  }
                  description={
                    products && products.length > 0
                      ? "Try a different search or category."
                      : `${store.shop_name} hasn't listed any products yet. Check back soon.`
                  }
                />
              ) : (
                <>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Showing {filtered.length} of {products?.length ?? 0} products
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {filtered.map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {tab === "reviews" && (
          <div className="mt-5 space-y-3">
            {rating && (
              <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
                <div className="text-center">
                  <p className="text-3xl font-extrabold text-foreground">
                    {rating.avg.toFixed(1)}
                  </p>
                  <StarRating value={rating.avg} size={16} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {rating.count} review{rating.count === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="h-12 w-px bg-border" />
                <div className="flex-1 text-sm text-muted-foreground">
                  Real reviews from Kivora buyers who purchased from this shop.
                </div>
              </div>
            )}

            {!reviews || reviews.length === 0 ? (
              <EmptyState
                icon={Star}
                title="No reviews yet"
                description="Be the first to buy and leave a review for this shop."
              />
            ) : (
              reviews.map((r: any) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        {r.display_name || "Kivora buyer"}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <StarRating value={r.rating} size={12} />
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                    {r.products?.name && (
                      <span className="max-w-[40%] truncate rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                        {r.products.name}
                      </span>
                    )}
                  </div>
                  {r.comment && (
                    <p className="mt-2 text-sm leading-relaxed text-foreground">
                      {r.comment}
                    </p>
                  )}
                  {r.seller_reply && (
                    <p className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                      <b className="text-foreground">{store.shop_name}:</b>{" "}
                      {r.seller_reply}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === "about" && (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="grid grid-cols-3 gap-2 md:col-span-2">
              {[
                { icon: CalendarDays, label: "On Kivora since", value: since },
                { icon: PackageOpen, label: "Products", value: String(count) },
                {
                  icon: Star,
                  label: "Rating",
                  value: rating ? `${rating.avg}/5` : "New",
                },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-border bg-card p-3 text-center sm:p-4"
                >
                  <Icon size={18} className="mx-auto text-primary" />
                  <p className="mt-1.5 text-sm font-extrabold text-foreground sm:text-base">
                    {value}
                  </p>
                  <p className="text-[10px] text-muted-foreground sm:text-[11px]">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <h2 className="flex items-center gap-2 font-bold text-foreground">
                <Store size={16} className="text-primary" />
                About {store.shop_name}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {store.bio || "This seller hasn't added a description yet."}
              </p>
              {store.location && (
                <p className="mt-3 flex items-center gap-2 text-sm text-foreground">
                  <MapPin size={14} className="text-primary" />
                  {store.location}
                </p>
              )}
              {store.business_category && (
                <p className="mt-1.5 flex items-center gap-2 text-sm text-foreground">
                  <BadgeCheck size={14} className="text-primary" />
                  {store.business_category}
                </p>
              )}
              {isVerified && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  <BadgeCheck size={14} />
                  Kivora Verified Seller
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <h2 className="flex items-center gap-2 font-bold text-foreground">
                <Truck size={16} className="text-primary" />
                Delivery & buyer protection
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Delivery across Ghana with fees shown at checkout. Payments are
                held safely until you confirm you received your order.
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold">
                <Link to="/shipping" className="text-primary hover:underline">
                  Shipping info
                </Link>
                <Link to="/returns" className="text-primary hover:underline">
                  Returns policy
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE STICKY CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-3 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-card/90 sm:hidden">
        <div className="mx-auto flex max-w-lg gap-2">
          <MessageSellerButton
            sellerId={store.user_id}
            className="flex flex-1 items-center justify-center gap-2 rounded-full gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-md"
            label="Message seller"
          />
          {waNumber && (
            <a
              href={`https://wa.me/${waNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-3 text-sm font-bold text-foreground"
            >
              <Phone size={18} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
