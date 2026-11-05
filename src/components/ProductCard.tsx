import { Product, formatGHC, useShop } from "@/lib/store";
import { Heart, Star, Minus, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useProductRatingsMap } from "@/lib/reviews";

export function ProductCard({ product }: { product: Product }) {
  const addToCart = useShop((s) => s.addToCart);
  const updateQty = useShop((s) => s.updateQty);
  const toggleWishlist = useShop((s) => s.toggleWishlist);

  const cartItem = useShop((s) => s.cart.find((c) => c.product.id === product.id));
  const qty = cartItem?.qty ?? 0;
  const wished = useShop((s) => s.wishlist.some((w) => w.id === product.id));

  const oldPrice =
    product.oldPrice ??
    (product.discount ? product.price + (product.price * product.discount) / 100 : null);

  const { data: ratings } = useProductRatingsMap();
  const rating = ratings?.[product.id];
  const stock = product.stock ?? 0;
  const outOfStock = stock <= 0;
  const lowStock = !outOfStock && stock <= 5;
  const atMax = qty >= stock;

  return (
    <div className="group flex h-full flex-col">
      {/* IMAGE TILE */}
      <Link
        to="/products/$id"
        params={{ id: product.id }}
        className="relative block aspect-square overflow-hidden rounded-2xl bg-muted"
      >
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className={`h-full w-full object-contain p-4 mix-blend-multiply transition-transform duration-500 group-hover:scale-105 dark:mix-blend-normal ${outOfStock ? "opacity-50" : ""}`}
        />

        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {product.discount ? (
            <span className="rounded-full bg-flash px-2 py-0.5 text-[10px] font-bold text-flash-foreground">
              -{product.discount}%
            </span>
          ) : null}
          {outOfStock ? (
            <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              Sold out
            </span>
          ) : lowStock ? (
            <span className="rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold text-warning-foreground">
              Only {stock} left
            </span>
          ) : null}
        </div>

        <button
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product);
            toast.success(wished ? "Removed from wishlist" : "Added to wishlist");
          }}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wished}
          className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full shadow-soft transition ${
            wished ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:text-primary"
          }`}
        >
          <Heart size={14} fill={wished ? "currentColor" : "none"} />
        </button>

        {/* Quick add */}
        <div className="absolute bottom-2 right-2">
          {qty === 0 ? (
            <button
              disabled={outOfStock}
              onClick={(e) => {
                e.preventDefault();
                const ok = addToCart(product);
                if (ok !== false) toast.success(`${product.name} added to cart`);
              }}
              aria-label={`Add ${product.name} to cart`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={18} strokeWidth={2.6} />
            </button>
          ) : (
            <div
              onClick={(e) => e.preventDefault()}
              className="flex items-center gap-1 rounded-full bg-card p-1 shadow-soft"
            >
              <button
                onClick={(e) => { e.preventDefault(); updateQty(product.id, qty - 1); }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-foreground active:scale-95"
                aria-label="Decrease quantity"
              >
                <Minus size={13} />
              </button>
              <span className="min-w-4 text-center text-xs font-bold text-foreground">{qty}</span>
              <button
                disabled={atMax}
                onClick={(e) => { e.preventDefault(); updateQty(product.id, qty + 1); }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-95 disabled:opacity-40"
                aria-label="Increase quantity"
              >
                <Plus size={13} />
              </button>
            </div>
          )}
        </div>
      </Link>

      {/* CONTENT */}
      <div className="flex flex-1 flex-col px-0.5 pt-2.5">
        <Link
          to="/products/$id"
          params={{ id: product.id }}
          className="line-clamp-2 break-words text-[13px] font-medium leading-[1.35] text-foreground hover:text-primary"
        >
          {product.name}
        </Link>

        {product.description ? (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{product.description}</p>
        ) : null}

        <div className="mt-1 flex items-center gap-1 text-[11px]">
          {rating ? (
            <>
              <Star size={11} className="text-warning" fill="currentColor" strokeWidth={0} />
              <span className="font-semibold text-foreground">{rating.avg.toFixed(1)}</span>
              <span className="text-muted-foreground">({rating.count})</span>
            </>
          ) : (
            <span className="text-muted-foreground">{outOfStock ? "Out of stock" : `${stock} in stock`}</span>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-baseline gap-x-1.5 pt-1">
          <span className="text-[15px] font-extrabold text-foreground">{formatGHC(product.price)}</span>
          {oldPrice ? (
            <span className="text-[11px] text-muted-foreground line-through">{formatGHC(oldPrice)}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
