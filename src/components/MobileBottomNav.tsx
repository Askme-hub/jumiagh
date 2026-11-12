import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutGrid, ShoppingCart, UserCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useShop } from "@/lib/store";

const tabs = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/categories", label: "Categories", icon: LayoutGrid },
  { to: "/cart", label: "Cart", icon: ShoppingCart, cart: true },
  { to: "/account", label: "Account", icon: UserCircle2 },
] as const;

/** Jumia-style edge-to-edge 4-tab bar for phones. */
export function MobileBottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const count = useShop((s) => s.cartCount());
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (path === "/login" || path === "/checkout") return null;

  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {tabs.map((t) => {
          const active = "exact" in t ? path === t.to : path === t.to || path.startsWith(t.to + "/");
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`relative flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-semibold ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {active && <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-primary" />}
              <span className="relative">
                <Icon size={22} strokeWidth={active ? 2.4 : 1.9} />
                {"cart" in t && mounted && count > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {count}
                  </span>
                )}
              </span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
