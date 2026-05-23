import { Product, formatGHC, useShop } from "@/lib/store";
import { toast } from "sonner";

export function ProductCard({ product }: { product: Product }) {
  const add = useShop((s) => s.addToCart);
  const stockPct = product.stock ? Math.min(100, (product.stock / 30) * 100) : 0;
  return (
    <button
      onClick={() => {
        add(product);
        toast.success("Added to cart");
      }}
      className="text-left bg-card rounded-md overflow-hidden w-44 shrink-0 border border-border/50"
    >
      <div className="relative bg-muted aspect-square">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-contain"
        />
        {product.discount && (
          <span className="absolute top-2 right-2 bg-primary-soft text-accent-foreground text-xs font-semibold px-1.5 py-0.5 rounded">
            -{product.discount}%
          </span>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-xs line-clamp-2 min-h-[2rem] leading-tight">{product.name}</p>
        <p className="font-bold text-sm mt-1.5">{formatGHC(product.price)}</p>
        {product.stock != null && (
          <>
            <p className="text-[11px] text-muted-foreground mt-1">{product.stock} items left</p>
            <div className="h-1 bg-muted rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${stockPct}%` }} />
            </div>
          </>
        )}
      </div>
    </button>
  );
}
