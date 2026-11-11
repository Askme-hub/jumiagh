import { trackViewed } from "@/lib/recently-viewed";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { formatGHC, useShop } from "@/lib/store";
import { toProduct, type DbProduct } from "@/lib/products";
import { useSellerBadge } from "@/lib/stores";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { MessageSellerButton } from "@/components/MessageSellerButton";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductReviews } from "@/components/ProductReviews";
import { useProductReviews } from "@/lib/reviews";
import { Heart, ShoppingCart, Truck, Shield, PackageX, Minus, Plus, ChevronRight, Star, PackageCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/products/$id")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("id", params.id).eq("approval_status", "approved")
      .maybeSingle();
    return { product: (data ?? null) as DbProduct | null };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.product;
    if (!p) return { meta: [{ title: "Product – Kivora Ghana" }] };
    const desc = (p.description ?? `Buy ${p.name} on Kivora Ghana with fast delivery and secure payments.`).slice(0, 155);
    return {
      meta: [
        { title: `${p.name} – Kivora Ghana` },
        { name: "description", content: desc },
        { property: "og:title", content: p.name },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        ...(p.image_url ? [{ property: "og:image", content: p.image_url }] : []),
        { name: "twitter:card", content: p.image_url ? "summary_large_image" : "summary" },
      ],
    };
  },
  component: ProductDetails,
  errorComponent: () => (
    <div>
      <PageHeader title="Product" />
      <EmptyState
        icon={PackageX}
        title="Something went wrong"
        description="We couldn't load this product. Please try again."
        action={{ label: "Back to home", to: "/" }}
      />
    </div>
  ),
  notFoundComponent: () => (
    <div>
      <PageHeader title="Product" />
      <EmptyState
        icon={PackageX}
        title="Product not found"
        description="This item may have been removed or is no longer available."
        action={{ label: "Continue shopping", to: "/" }}
      />
    </div>
  ),
});

function ProductSkeleton() {
  return (
    <div>
      <PageHeader title="Product Details" />
      <div className="bg-card">
        <Skeleton className="aspect-square w-full rounded-none" />
      </div>
      <div className="mt-2 space-y-3 bg-card p-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-1/2" />
      </div>
      <div className="mt-2 space-y-2 bg-card p-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

function ProductDetails() {
  const { product: data } = Route.useLoaderData();
  const router = useRouter();
  const { data: reviewData } = useProductReviews(data?.id);
  const reviewCount = reviewData?.length ?? 0;
  const avgRating = reviewCount > 0
    ? Math.round((reviewData!.reduce((a, r) => a + r.rating, 0) / reviewCount) * 10) / 10
    : null;
  const addToCart = useShop((s) => s.addToCart);
  const updateQty = useShop((s) => s.updateQty);
  const toggleWishlist = useShop((s) => s.toggleWishlist);
  useEffect(() => { if (data?.id) trackViewed(data.id); }, [data?.id]);
  const productId = data?.id;

  useEffect(() => {
    if (!productId) return;
    const channel = supabase
      .channel(`product-${productId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "products", filter: `id=eq.${productId}` },
        () => { void router.invalidate(); }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [productId, router]);

  const wished = useShop((s) => (data ? s.wishlist.some((w) => w.id === data.id) : false));
  const cartQty = useShop((s) => (data ? s.cart.find((c) => c.product.id === data.id)?.qty ?? 0 : 0));

  if (router.state.isLoading && !data) return <ProductSkeleton />;

  if (!data) {
    return (
      <div>
        <PageHeader title="Product" />
        <EmptyState
          icon={PackageX}
          title="Product not found"
          description="This item may have been removed or is no longer available."
          action={{ label: "Continue shopping", to: "/" }}
        />
      </div>
    );
  }

  const product = toProduct(data);
  const images = Array.from(new Set([product.image, ...((data as DbProduct & { image_urls?: string[] }).image_urls ?? [])].filter(Boolean))) as string[];
  const oldPrice = product.discount ? product.price + (product.price * product.discount) / 100 : null;

  const wishlistButton = (
    <button
      onClick={() => {
        toggleWishlist(product);
        toast.success(wished ? "Removed from wishlist" : "Added to wishlist");
      }}
      aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={wished}
      className={`absolute right-3 top-3 rounded-full p-2.5 shadow-sm backdrop-blur transition ${
        wished
          ? "bg-primary text-primary-foreground"
          : "bg-background/90 text-foreground hover:bg-primary hover:text-primary-foreground"
      }`}
    >
      <Heart size={18} fill={wished ? "currentColor" : "none"} />
    </button>
  );

  const buyBox = (
    <div className="flex gap-2">
      {cartQty === 0 ? (
        <>
          <Link
            to="/cart"
            className="flex-1 rounded-2xl border-2 border-primary py-3.5 text-center font-bold text-primary transition active:scale-[0.98]"
          >
            View Cart
          </Link>
          <button
            disabled={data.stock <= 0}
            onClick={() => {
              const ok = addToCart(product);
              if (ok) toast.success("Added to cart");
              else toast.error(`Only ${product.stock ?? 0} in stock`);
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-bold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
          >
            <ShoppingCart size={18} /> {data.stock <= 0 ? "Out of stock" : "Add to Cart"}
          </button>
        </>
      ) : (
        <>
          <div className="flex flex-1 items-center justify-between overflow-hidden rounded-2xl bg-muted">
            <button
              onClick={() => updateQty(product.id, cartQty - 1)}
              className="flex h-12 w-12 items-center justify-center text-primary transition hover:bg-primary/10"
              aria-label="Decrease quantity"
            >
              <Minus size={18} />
            </button>
            <span className="text-sm font-bold text-foreground">{cartQty} in cart</span>
            <button
              disabled={cartQty >= (product.stock ?? Infinity)}
              onClick={() => {
                const ok = updateQty(product.id, cartQty + 1);
                if (!ok) toast.error(`Only ${product.stock ?? 0} in stock`);
              }}
              className="flex h-12 w-12 items-center justify-center text-primary transition hover:bg-primary/10 disabled:opacity-40"
              aria-label="Increase quantity"
            >
              <Plus size={18} />
            </button>
          </div>
          <Link
            to="/cart"
            className="flex flex-1 items-center justify-center rounded-2xl bg-primary py-3.5 font-bold text-primary-foreground transition active:scale-[0.98]"
          >
            Checkout
          </Link>
        </>
      )}
    </div>
  );

  return (
    <div className="pb-28 lg:pb-10">
      <PageHeader title="Product Details" />

      <div className="mx-auto w-full max-w-6xl px-0 lg:px-6">
        {/* BREADCRUMB */}
        <nav className="flex items-center gap-1 px-4 py-2.5 text-xs text-muted-foreground lg:px-0">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight size={12} />
          <Link to="/categories" className="hover:text-foreground">Categories</Link>
          {data.category && (
            <>
              <ChevronRight size={12} />
              <span className="truncate font-medium text-foreground">{data.category}</span>
            </>
          )}
        </nav>

        <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-6">
          {/* LEFT: gallery + description */}
          <div className="contents lg:block lg:space-y-4">
            <div className="order-1 bg-card lg:rounded-2xl lg:border lg:border-border lg:shadow-soft lg:overflow-hidden">
              <ProductGallery
                images={images}
                alt={product.name}
                overlay={<>
                  {product.discount && (
                    <div className="absolute left-3 top-3 rounded-full bg-flash px-2.5 py-1 text-xs font-bold text-flash-foreground shadow">
                      -{product.discount}%
                    </div>
                  )}
                  {wishlistButton}
                </>}
              />
            </div>

            <div className="order-3 mt-2 bg-card p-4 lg:mt-0 lg:rounded-2xl lg:border lg:border-border">
              <h2 className="mb-2 font-bold text-foreground">Product Description</h2>
              <p className="whitespace-pre-line text-sm text-foreground/80">
                {data.description ?? "No description provided for this product."}
              </p>
            </div>

            <div id="reviews" className="order-4"><ProductReviews productId={data.id} /></div>
          </div>

          {/* RIGHT: buy box */}
          <div className="order-2 lg:space-y-4">
            <div className="relative -mt-6 rounded-t-3xl bg-card p-5 lg:mt-0 lg:rounded-2xl lg:border lg:border-border lg:shadow-soft">
              <h1 className="text-xl font-bold tracking-tight text-foreground lg:text-2xl">{product.name}</h1>

              {/* Stat pills */}
              <div className="mt-3 flex flex-wrap gap-2">
                <a href="#reviews" className="inline-flex items-center gap-1.5 rounded-xl border border-border px-2.5 py-1.5 text-xs">
                  <Star size={13} className="text-warning" fill="currentColor" strokeWidth={0} />
                  <span className="font-bold text-foreground">{avgRating ?? "New"}</span>
                  <span className="text-muted-foreground">{reviewCount} review{reviewCount === 1 ? "" : "s"}</span>
                </a>
                <span className={`inline-flex items-center gap-1.5 rounded-xl border border-border px-2.5 py-1.5 text-xs font-bold ${data.stock > 0 ? "text-success-ink" : "text-destructive"}`}>
                  <PackageCheck size={13} />
                  {data.stock > 0 ? `${data.stock} in stock` : "Out of stock"}
                </span>
                {product.discount ? (
                  <span className="inline-flex items-center rounded-xl bg-flash px-2.5 py-1.5 text-xs font-bold text-flash-foreground">
                    -{product.discount}%
                  </span>
                ) : null}
              </div>

              {/* Price box */}
              <div className="mt-4 flex items-baseline gap-2 rounded-2xl bg-muted px-4 py-3">
                <span className="text-xl font-extrabold text-foreground">{formatGHC(product.price)}</span>
                {oldPrice && <span className="text-sm text-muted-foreground line-through">{formatGHC(oldPrice)}</span>}
              </div>

              {data.description && (
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{data.description}</p>
              )}

              {/* Desktop buy box (mobile uses the sticky bar) */}
              <div className="mt-4 hidden lg:block">{buyBox}</div>
            </div>

            <SellerCard sellerId={data.seller_id ?? null} productId={data.id} />

            <div className="mt-2 space-y-3 bg-card p-4 lg:mt-0 lg:rounded-2xl lg:border lg:border-border">
              <div className="flex items-center gap-3 text-sm">
                <Truck size={18} className="text-primary" />
                <div>
                  <p className="font-semibold text-foreground">Delivery</p>
                  <p className="text-xs text-muted-foreground">Door delivery or pickup station available across Ghana</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Shield size={18} className="text-primary" />
                <div>
                  <p className="font-semibold text-foreground">Return Policy</p>
                  <p className="text-xs text-muted-foreground">Free returns within 7 days for eligible items</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky mobile buy bar */}
      <div className="fixed bottom-[84px] left-0 right-0 z-40 mx-auto max-w-md border-t border-border bg-card p-3 md:bottom-0 lg:hidden">
        {buyBox}
      </div>
    </div>
  );
}


function SellerCard({ sellerId, productId }: { sellerId: string | null; productId?: string }) {
  const { data: seller } = useSellerBadge(sellerId);
  if (!seller) return null;
  return (
    <div className="mt-2 bg-card p-4 lg:mt-0 lg:rounded-2xl lg:border lg:border-border">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Sold by
      </p>
      <div className="mt-2 flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-muted">
          {seller.logo_url ? (
            <img src={seller.logo_url} alt={seller.shop_name} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {seller.slug ? (
              <Link
                to="/shop/$slug"
                params={{ slug: seller.slug }}
                className="truncate text-sm font-bold text-foreground hover:text-primary"
              >
                {seller.shop_name}
              </Link>
            ) : (
              <span className="truncate text-sm font-bold text-foreground">{seller.shop_name}</span>
            )}
            {seller.verified && <VerifiedBadge explainable />}
          </div>
          {seller.slug && (
            <Link
              to="/shop/$slug"
              params={{ slug: seller.slug }}
              className="text-xs font-semibold text-primary"
            >
              Visit store
            </Link>
          )}
        </div>
      </div>
      {sellerId && (
        <div className="mt-3">
          <MessageSellerButton sellerId={sellerId} productId={productId} />
        </div>
      )}
    </div>
  );
}
