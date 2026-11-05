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

  const saving = oldPrice ? oldPrice - product.price : 0;

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground transition-shadow duration-200 hover:shadow-elevated">
      <Link
        to="/products/$id"
        params={{ id: product.id }}
        className="relative block aspect-square overflow-hidden bg-card"
      >
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className={`h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-105 ${outOfStock ? "opacity-50" : ""}`}
        />
        {product.discount ? (
          <span className="absolute left-2 top-2 rounded-md bg-primary-soft px-1.5 py-0.5 text-[11px] font-bold text-primary">
            -{product.discount}%
          </span>
        ) : null}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product);
            toast.success(wished ? "Removed from wishlist" : "Added to wishlist");
          }}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wished}
          className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card transition ${
            wished ? "text-primary" : "text-muted-foreground hover:text-primary"
          }`}
        >
          <Heart size={15} fill={wished ? "currentColor" : "none"} />
        </button>
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <Link
          to="/products/$id"
          params={{ id: product.id }}
          className="line-clamp-2 min-h-[2.5rem] break-words text-[13px] leading-5 text-foreground hover:text-primary"
        >
          {product.name}
        </Link>

        <div>
          <p className="text-base font-bold text-foreground">{formatGHC(product.price)}</p>
          {oldPrice ? (
            <p className="text-[11px] text-muted-foreground">
              <span className="line-through">{formatGHC(oldPrice)}</span>
              {saving > 0 ? <span className="ml-1 text-primary">Save {formatGHC(saving)}</span> : null}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-1 text-[11px]">
          {rating ? (
            <>
              <div className="flex text-warning">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={11} fill={i <= Math.round(rating.avg) ? "currentColor" : "none"} />
                ))}
              </div>
              <span className="text-muted-foreground">({rating.count})</span>
            </>
          ) : null}
        </div>

        <p className={`text-[11px] font-medium ${outOfStock ? "text-destructive" : lowStock ? "text-flash" : "text-muted-foreground"}`}>
          {outOfStock ? "Out of stock" : lowStock ? `Only ${stock} left` : "In stock"}
        </p>

        <div className="mt-auto pt-1.5">
          {qty === 0 ? (
            <button
              disabled={outOfStock}
              data-add-cart
              onClick={() => {
                const ok = addToCart(product);
                if (ok !== false) toast.success(`${product.name} added to cart`);
              }}
              className="w-full rounded-lg bg-primary py-2 text-xs font-bold uppercase tracking-wide text-primary-foreground transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {outOfStock ? "Sold out" : "Add to cart"}
            </button>
          ) : (
            <div className="flex items-center justify-between">
              <button
                onClick={() => updateQty(product.id, qty - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground active:scale-95"
                aria-label="Decrease quantity"
              >
                <Minus size={14} />
              </button>
              <span className="text-sm font-bold text-foreground">{qty}</span>
              <button
                disabled={atMax}
                onClick={() => updateQty(product.id, qty + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground active:scale-95 disabled:opacity-40"
                aria-label="Increase quantity"
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
