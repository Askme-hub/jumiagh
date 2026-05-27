import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  LayoutGrid,
  ShoppingCart,
  Heart,
  UserCircle2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useShop } from "@/lib/store";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/categories", label: "Categories", icon: LayoutGrid },
  { to: "/cart", label: "Cart", icon: ShoppingCart },
  { to: "/wishlist", label: "Wishlist", icon: Heart },
  { to: "/account", label: "Account", icon: UserCircle2 },
] as const;

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const count = useShop((s) => s.cartCount());
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (
    path === "/login" ||
    path.startsWith("/admin") ||
    path.startsWith("/products/") ||
    path.startsWith("/checkout")
  )
    return null;

  return (
    <nav className="fixed bottom-4 inset-x-0 z-40 max-w-md mx-auto px-4">
      <div
        className="
          backdrop-blur-xl bg-white/80 dark:bg-black/40
          border border-white/30 dark:border-white/10
          shadow-xl shadow-black/10
          rounded-2xl px-3 py-2
        "
      >
        <ul className="grid grid-cols-5">
          {items.map(({ to, label, icon: Icon }) => {
            const active = path === to;

            return (
              <li key={to} className="flex justify-center">
                <Link
                  to={to}
                  className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-all
                    ${
                      active
                        ? "text-orange-600 scale-[1.05]"
                        : "text-gray-600 dark:text-gray-300"
                    }
                  `}
                >
                  <span className="relative">
                    <Icon
                      size={22}
                      className={`
                        transition-all
                        ${
                          active
                            ? "text-orange-600 drop-shadow-[0_0_6px_rgba(255,120,40,0.6)]"
                            : "text-gray-600 dark:text-gray-300"
                        }
                      `}
                      strokeWidth={active ? 2.3 : 1.8}
                    />

                    {/* Cart badge */}
                    {to === "/cart" && mounted && count > 0 && (
                      <span
                        className="
                          absolute -top-2 -right-2 w-4 h-4 rounded-full
                          bg-orange-600 text-white text-[10px] leading-none
                          flex items-center justify-center font-bold shadow
                        "
                      >
                        {count}
                      </span>
                    )}
                  </span>

                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
