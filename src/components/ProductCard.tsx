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
  const addToCart = useShop((s) => s.addToCart);

  const oldPrice = product.discount
    ? product.price + (product.price * product.discount) / 100
    : null;

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-200 hover:shadow-lg transition-all duration-300 group w-full">
      
      {/* IMAGE */}
      <div className="relative bg-gray-50 aspect-square overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
        />

        {/* DISCOUNT */}
        {product.discount && (
          <div className="absolute top-2 left-2 bg-orange-500 text-white text-[11px] font-bold px-2 py-1 rounded-md">
            -{product.discount}%
          </div>
        )}

        {/* FAVORITE */}
        <button className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-sm">
          <Heart size={16} />
        </button>
      </div>

      {/* CONTENT */}
      <div className="p-3">
        {/* PRODUCT NAME */}
        <h3 className="text-sm font-medium leading-5 line-clamp-2 min-h-[40px]">
          {product.name}
        </h3>

        {/* PRICE */}
        <div className="mt-2">
          <p className="text-lg font-bold text-gray-900">
            {formatGHC(product.price)}
          </p>

          {oldPrice && (
            <p className="text-xs text-gray-400 line-through">
              {formatGHC(oldPrice)}
            </p>
          )}
        </div>

        {/* RATING */}
        <div className="flex items-center gap-1 mt-2">
          <div className="flex text-yellow-400">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                size={13}
                fill="currentColor"
                strokeWidth={0}
              />
            ))}
          </div>

          <span className="text-xs text-gray-500">
            (4.8)
          </span>
        </div>

        {/* DELIVERY */}
        <p className="text-xs text-green-600 font-medium mt-1">
          Free Delivery
        </p>

        {/* BUTTON */}
        <button
          onClick={() => {
            addToCart(product);
            toast.success("Added to cart");
          }}
          className="w-full mt-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition"
        >
          <ShoppingCart size={16} />
          Add to Cart
        </button>
      </div>
    </div>
  );
}
