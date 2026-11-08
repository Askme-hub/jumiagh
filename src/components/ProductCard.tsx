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
  const discount =
    product.discount ??
    (oldPrice && oldPrice > product.price
      ? Math.round(((oldPrice - product.price) / oldPrice) * 100)
      : 0);

  const { data: ratings } = useProductRatingsMap();
  const rating = ratings?.[product.id];
  const stock = product.stock ?? 0;
  const outOfStock = stock <= 0;
  const lowStock = !outOfStock && stock <= 5;
  const atMax = qty >= stock;

  const add = () => {
    const ok = addToCart(product);
    if (ok !== false) toast.success(`${product.name} added to cart`);
  };

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card text-card-foreground shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:shadow-elevated">
      {/* Image area */}
      <div className="relative">
        <Link
          to="/products/$id"
          params={{ id: product.id }}
          className="block aspect-square overflow-hidden bg-muted/40"
        >
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className={`h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-[1.04] ${
              outOfStock ? "opacity-45 grayscale" : ""
            }`}
          />
        </Link>

        {/* Wishlist */}
        <button
          onClick={() => {
            toggleWishlist(product);
            toast.success(wished ? "Removed from wishlist" : "Added to wishlist");
          }}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wished}
          className={`absolute left-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-sm backdrop-blur-sm transition ${
            wished
              ? "text-primary"
              : "text-muted-foreground hover:text-primary"
          }`}
        >
          <Heart size={15} fill={wished ? "currentColor" : "none"} strokeWidth={2} />
        </button>

        {/* Discount badge */}
        {discount > 0 && !outOfStock && (
          <span className="absolute bottom-2.5 left-2.5 rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-primary-foreground shadow-sm">
            -{discount}%
          </span>
        )}

        {/* Quick add / qty control */}
        <div className="absolute right-2.5 top-2.5">
          {qty === 0 ? (
            <button
              disabled={outOfStock}
              data-add-cart
              onClick={add}
              aria-label="Add to cart"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background shadow-md transition active:scale-95 disabled:opacity-40"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          ) : (
            <div className="flex items-center gap-0.5 rounded-full bg-foreground p-0.5 text-background shadow-md">
              <button
                onClick={() => updateQty(product.id, qty - 1)}
                aria-label="Decrease quantity"
                className="flex h-8 w-8 items-center justify-center rounded-full"
              >
                <Minus size={14} />
              </button>
              <span className="min-w-[1.1rem] text-center text-sm font-bold">{qty}</span>
              <button
                disabled={atMax}
                onClick={() => updateQty(product.id, qty + 1)}
                aria-label="Increase quantity"
                className="flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-40"
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <Link
        to="/products/$id"
        params={{ id: product.id }}
        className="flex flex-1 flex-col gap-1.5 px-3 pb-3 pt-2.5"
      >
        <p className="line-clamp-2 min-h-[2.4rem] text-[13px] font-medium leading-snug text-foreground">
          {product.name}
        </p>

        {rating ? (
          <div className="flex items-center gap-1 text-[12px]">
            <Star size={12} className="text-amber-500" fill="currentColor" />
            <span className="font-semibold text-foreground">{rating.avg.toFixed(1)}</span>
            <span className="text-muted-foreground">({rating.count})</span>
          </div>
        ) : (
          <div className="h-[18px]" />
        )}

        <div className="mt-auto">
          <p className="text-[17px] font-bold leading-tight tracking-tight text-foreground">
            {formatGHC(product.price)}
          </p>
          {oldPrice ? (
            <p className="mt-0.5 text-[12px] text-muted-foreground line-through">
              {formatGHC(oldPrice)}
            </p>
          ) : null}
        </div>

        {(outOfStock || lowStock) && (
          <p
            className={`text-[11px] font-semibold ${
              outOfStock ? "text-destructive" : "text-amber-600"
            }`}
          >
            {outOfStock ? "Out of stock" : `Only ${stock} left`}
          </p>
        )}
      </Link>
    </div>
  );
}
