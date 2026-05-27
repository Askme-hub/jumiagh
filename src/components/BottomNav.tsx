import {
  Link,
  useRouterState,
} from "@tanstack/react-router";

import {
  Home,
  LayoutGrid,
  ShoppingCart,
  Heart,
  UserCircle2,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import { useShop } from "@/lib/store";

const items = [
  {
    to: "/",
    label: "Home",
    icon: Home,
  },

  {
    to: "/categories",
    label: "Explore",
    icon: LayoutGrid,
  },

  {
    to: "/cart",
    label: "Cart",
    icon: ShoppingCart,
  },

  {
    to: "/wishlist",
    label: "Saved",
    icon: Heart,
  },

  {
    to: "/account",
    label: "Profile",
    icon: UserCircle2,
  },
] as const;

export function BottomNav() {
  const path = useRouterState({
    select: (s) =>
      s.location.pathname,
  });

  const count = useShop((s) =>
    s.cartCount()
  );

  const [mounted, setMounted] =
    useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (
    path === "/login" ||
    path.startsWith("/admin") ||
    path.startsWith("/products/") ||
    path.startsWith("/checkout")
  )
    return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 max-w-md mx-auto px-3 pb-3">
      
      {/* GLASS NAV */}
      <nav className="bg-black/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        <ul className="grid grid-cols-5">
          {items.map(
            ({
              to,
              label,
              icon: Icon,
            }) => {
              const active =
                path === to;

              return (
                <li key={to}>
                  <Link
                    to={to}
                    className="relative flex flex-col items-center justify-center py-3"
                  >
                    
                    {/* ACTIVE BG */}
                    {active && (
                      <div className="absolute inset-2 rounded-2xl bg-[#ff7a00] shadow-lg shadow-orange-500/30" />
                    )}

                    {/* CONTENT */}
                    <div className="relative flex flex-col items-center gap-1 z-10">
                      
                      {/* ICON */}
                      <div className="relative">
                        <Icon
                          size={21}
                          className={`transition-all duration-300 ${
                            active
                              ? "text-white scale-110"
                              : "text-zinc-400"
                          }`}
                          strokeWidth={
                            active
                              ? 2.4
                              : 2
                          }
                        />

                        {/* CART BADGE */}
                        {to === "/cart" &&
                          mounted &&
                          count > 0 && (
                            <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-white text-[#ff7a00] text-[10px] rounded-full flex items-center justify-center font-bold shadow-md">
                              {count}
                            </span>
                          )}
                      </div>

                      {/* LABEL */}
                      <span
                        className={`text-[10px] font-semibold transition ${
                          active
                            ? "text-white"
                            : "text-zinc-400"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            }
          )}
        </ul>
      </nav>
    </div>
  );
}
