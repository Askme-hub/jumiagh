import { Product, formatGHC, useShop } from "@/lib/store";
import { Heart, Star, Minus, Plus, ShoppingBag } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

export function ProductCard({ product }: { product: Product }) {
  const addToCart = useShop((s) => s.addToCart);
  const updateQty = useShop((s) => s.updateQty);
  const toggleWishlist = useShop((s) => s.toggleWishlist);
  const isWishlisted = useShop((s) => s.isWishlisted);

  const cartItem = useShop((s) => s.cart.find((c) => c.product.id === product.id));
  const qty = cartItem?.qty ?? 0;
  const wished = isWishlisted(product.id);

  const oldPrice = product.discount
    ? product.price + (product.price * product.discount) / 100
    : null;

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated hover:border-primary/40">
      {/* IMAGE */}
      <Link
        to="/products/$id"
        params={{ id: product.id }}
        className="relative block aspect-square overflow-hidden bg-muted/40"
      >
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-105"
        />

        {product.discount && (
          <div className="absolute left-2 top-2 rounded-full bg-flash px-2 py-1 text-[10px] font-bold text-flash-foreground shadow">
            -{product.discount}%
          </div>
        )}

        <button
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product);
            toast.success(wished ? "Removed from wishlist" : "Added to wishlist");
          }}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute right-2 top-2 rounded-full bg-background/90 p-2 text-foreground shadow-sm backdrop-blur transition hover:bg-primary hover:text-primary-foreground"
        >
          <Heart size={15} fill={wished ? "currentColor" : "none"} className={wished ? "text-primary" : ""} />
        </button>
      </Link>

      {/* CONTENT */}
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 min-h-[40px] text-sm font-medium leading-5 text-foreground">
          {product.name}
        </h3>

        <div className="mt-2">
          <p className="text-lg font-extrabold text-foreground">{formatGHC(product.price)}</p>
          {oldPrice && (
            <div className="mt-0.5 flex items-center gap-2">
              <p className="text-xs text-muted-foreground line-through">{formatGHC(oldPrice)}</p>
              <span className="text-[10px] font-semibold text-success">Save {product.discount}%</span>
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center gap-1">
          <div className="flex text-warning">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} size={11} fill="currentColor" strokeWidth={0} />
            ))}
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">4.9</span>
          <span className="text-[10px] text-muted-foreground/70">(24)</span>
        </div>

        {product.stock ? (
          <div className="mt-2">
            <p className="text-[11px] font-semibold text-primary">Only {product.stock} left</p>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(product.stock * 10, 100)}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="mt-auto pt-3">
          {qty === 0 ? (
            <button
              onClick={() => {
                addToCart(product);
                toast.success(`${product.name} added to cart`);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-[13px] font-semibold text-primary-foreground shadow-sm transition-all duration-300 hover:bg-primary/90 active:scale-[0.98]"
            >
              <ShoppingBag size={15} />
              Add to Cart
            </button>
          ) : (
            <div className="flex w-full items-center justify-between overflow-hidden rounded-xl border border-primary/30 bg-muted">
              <button
                onClick={() => updateQty(product.id, qty - 1)}
                className="flex h-10 w-10 items-center justify-center text-primary transition hover:bg-primary/10"
                aria-label="Decrease quantity"
              >
                <Minus size={15} />
              </button>
              <span className="text-[13px] font-bold text-foreground">{qty} in cart</span>
              <button
                onClick={() => updateQty(product.id, qty + 1)}
                className="flex h-10 w-10 items-center justify-center text-primary transition hover:bg-primary/10"
                aria-label="Increase quantity"
              >
                <Plus size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
