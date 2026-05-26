import { Product, formatGHC, useShop } from "@/lib/store";
import { Heart, Star, Minus, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

export function ProductCard({
  product,
}: {
  product: Product;
}) {
  const addToCart = useShop((s) => s.addToCart);
  const updateQty = useShop((s) => s.updateQty);
  const cartItem = useShop((s) => s.cart.find((c) => c.product.id === product.id));
  const qty = cartItem?.qty ?? 0;


  const oldPrice = product.discount
    ? product.price + (product.price * product.discount) / 100
    : null;

  return (
    <div className="bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-md transition-all duration-200 w-full">
      
      {/* IMAGE */}
      <Link to="/products/$id" params={{ id: product.id }} className="relative bg-gray-50 aspect-square block">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-contain p-2"
        />

        {/* DISCOUNT */}
        {product.discount && (
          <div className="absolute top-2 left-2 bg-orange-100 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded">
            -{product.discount}%
          </div>
        )}

        {/* HEART */}
        <span className="absolute top-2 right-2 bg-white shadow-sm rounded-full p-1">
          <Heart size={14} />
        </span>
      </Link>

      {/* CONTENT */}
      <div className="p-2">
        
        {/* NAME */}
        <h3 className="text-[13px] leading-4 line-clamp-2 min-h-[32px] text-gray-800">
          {product.name}
        </h3>

        {/* PRICE */}
        <div className="mt-1">
          <p className="font-bold text-[15px] text-black">
            {formatGHC(product.price)}
          </p>

          {oldPrice && (
            <p className="text-[11px] text-gray-400 line-through">
              {formatGHC(oldPrice)}
            </p>
          )}
        </div>

        {/* RATING */}
        <div className="flex items-center gap-1 mt-1">
          <div className="flex text-yellow-400">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                size={10}
                fill="currentColor"
                strokeWidth={0}
              />
            ))}
          </div>

          <span className="text-[10px] text-gray-500">
            (24)
          </span>
        </div>

        {/* STOCK */}
        {product.stock && (
          <p className="text-[10px] text-orange-600 mt-1">
            Only {product.stock} left
          </p>
        )}

        {/* BUTTON / QTY STEPPER */}
        {qty === 0 ? (
          <button
            onClick={() => {
              addToCart(product);
              toast.success("Added to cart");
            }}
            className="w-full mt-2 border border-orange-500 text-orange-500 rounded-md py-1.5 text-[12px] font-semibold hover:bg-orange-500 hover:text-white transition"
          >
            Add to Cart
          </button>
        ) : (
          <div className="w-full mt-2 flex items-center justify-between border border-orange-500 rounded-md overflow-hidden">
            <button
              onClick={() => updateQty(product.id, qty - 1)}
              className="w-8 h-8 flex items-center justify-center text-orange-500 hover:bg-orange-50"
              aria-label="Decrease"
            >
              <Minus size={14} />
            </button>
            <span className="text-[13px] font-bold text-orange-600">{qty} in cart</span>
            <button
              onClick={() => updateQty(product.id, qty + 1)}
              className="w-8 h-8 flex items-center justify-center text-orange-500 hover:bg-orange-50"
              aria-label="Increase"
            >
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
