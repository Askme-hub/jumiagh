import { Product, formatGHC, useShop } from "@/lib/store";
import { toast } from "sonner";
import {
  Heart,
  ShoppingCart,
  Star,
} from "lucide-react";

export function ProductCard({
  product,
}: {
  product: Product;
}) {
  const add = useShop((s) => s.addToCart);

  const stockPct = product.stock
    ? Math.min(100, (product.stock / 30) * 100)
    : 0;

  const oldPrice = product.discount
    ? product.price + (product.price * product.discount) / 100
    : null;

  return (
    <div className="bg-card rounded-xl overflow-hidden border border-border/40 shadow-sm hover:shadow-lg transition-all duration-300 active:scale-[0.98] group">
      
      {/* IMAGE */}
      <div className="relative bg-muted aspect-square p-3">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
        />

        {/* DISCOUNT */}
        {product.discount && (
          <span className="absolute top-2 left-2 bg-primary text-white text-[11px] font-bold px-2 py-1 rounded-md shadow">
            -{product.discount}%
          </span>
        )}

        {/* FAVORITE */}
        <button className="absolute top-2 right-2 bg-background/90 backdrop-blur rounded-full p-1.5 shadow">
          <Heart size={16} />
        </button>
      </div>

      {/* CONTENT */}
      <div className="p-3">
        {/* NAME */}
        <p className="text-sm line-clamp-2 leading-tight min-h-[2.5rem]">
          {product.name}
        </p>

        {/* PRICE */}
        <div className="mt-2">
          <p className="font-bold text-base">
            {formatGHC(product.price)}
          </p>

          {oldPrice && (
            <p className="text-xs text-muted-foreground line-through">
              {formatGHC(oldPrice)}
            </p>
          )}
        </div>

        {/* RATING */}
        <div className="flex items-center gap-1 mt-2">
          <div className="flex text-yellow-500">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                size={12}
                fill="currentColor"
              />
            ))}
          </div>

          <span className="text-[11px] text-muted-foreground">
            (124)
          </span>
        </div>

        {/* DELIVERY */}
        <p className="text-[11px] text-green-600 font-medium mt-1">
          Free Delivery
        </p>

        {/* STOCK */}
        {product.stock != null && (
          <div className="mt-3">
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-muted-foreground">
                Stock Left
              </span>

              <span className="font-medium">
                {product.stock}
              </span>
            </div>

            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${stockPct}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* BUTTON */}
        <button
          onClick={() => {
            add(product);
            toast.success("Added to cart");
          }}
          className="mt-4 w-full bg-primary text-primary-foreground rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition"
        >
          <ShoppingCart size={16} />
          Add to Cart
        </button>
      </div>
    </div>
  );
}
