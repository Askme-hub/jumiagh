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
    product.discount ?? (oldPrice && oldPrice > product.price ? Math.round(((oldPrice - product.price) / oldPrice) * 100) : 0);

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
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card text-card-foreground shadow-[0_1px_2px_rgba(0,0,0,0.025)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-elevated">
      <div className="relative">
        <Link to="/products/$id" params={{ id: product.id }} className="block aspect-square overflow-hidden bg-gradient-to-b from-muted/40 to-card">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className={`h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.04] ${outOfStock ? "opacity-50" : ""}`}
          />
        </Link>
        <button
          onClick={() => {
            toggleWishlist(product);
            toast.success(wished ? "Removed from wishlist" : "Added to wishlist");
          }}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wished}
          className={`absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 transition ${
            wished ? "text-primary" : "text-muted-foreground hover:text-primary"
          }`}
        >
          <Heart size={15} fill={wished ? "currentColor" : "none"} />
        </button>

        {/* Jumia-style quick add */}
        <div className="absolute right-2 top-2">
          {qty === 0 ? (
            <button
              disabled={outOfStock}
              data-add-cart
              onClick={add}
              aria-label="Add to cart"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md transition active:scale-95 disabled:opacity-40"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          ) : (
            <div className="flex items-center gap-1 rounded-xl bg-primary p-0.5 text-primary-foreground shadow-md">
              <button onClick={() => updateQty(product.id, qty - 1)} aria-label="Decrease quantity" className="flex h-8 w-8 items-center justify-center rounded-lg">
                <Minus size={14} />
              </button>
              <span className="min-w-4 text-center text-sm font-bold">{qty}</span>
              <button disabled={atMax} onClick={() => updateQty(product.id, qty + 1)} aria-label="Increase quantity" className="flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-40">
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      <Link to="/products/$id" params={{ id: product.id }} className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="line-clamp-2 min-h-[2.5rem] break-words text-[12px] font-medium leading-[1.45rem] text-foreground sm:text-[13px]">{product.name}</p>

        {rating ? (
          <div className="flex items-center gap-1 text-[12px]">
            <Star size={13} className="text-warning" fill="currentColor" />
            <span className="font-semibold text-foreground">{rating.avg.toFixed(1)}</span>
            <span className="text-muted-foreground">({rating.count})</span>
          </div>
        ) : null}

        <p className="text-base font-extrabold leading-tight text-foreground sm:text-lg">{formatGHC(product.price)}</p>
        {oldPrice ? (
          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-muted-foreground line-through">{formatGHC(oldPrice)}</span>
            {discount > 0 && (
              <span className="rounded-md bg-success-soft px-1.5 py-0.5 text-[10px] font-extrabold text-success-ink">-{discount}%</span>
            )}
          </div>
        ) : null}

        {(outOfStock || lowStock) && (
          <p className={`text-[11px] font-medium ${outOfStock ? "text-destructive" : "text-flash"}`}>
            {outOfStock ? "Out of stock" : `Only ${stock} left`}
          </p>
        )}
      </Link>
    </div>
  );
}
