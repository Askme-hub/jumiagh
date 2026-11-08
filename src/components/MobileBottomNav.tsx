import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutGrid, ShoppingBag, Heart, UserCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useShop } from "@/lib/store";
import { InstallAppButton } from "@/components/InstallAppButton";
import { useInstallPrompt } from "@/lib/pwa";

const left = [
  { to: "/" as const, label: "Home", icon: Home, exact: true },
  { to: "/categories" as const, label: "Categories", icon: LayoutGrid },
];

const right = [
  { to: "/wishlist" as const, label: "Wishlist", icon: Heart },
  { to: "/account" as const, label: "Account", icon: UserCircle2 },
];

function mountedSafe(available: boolean, installed: boolean, isIOS: boolean) {
  return !installed && (available || isIOS);
}

export function MobileBottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const count = useShop((s) => s.cartCount());
  const { available, installed, isIOS } = useInstallPrompt();
  const showInstall = mountedSafe(available, installed, isIOS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (path === "/login" || path === "/checkout") return null;

  const Item = ({
    to,
    label,
    icon: Icon,
    exact,
  }: {
    to: string;
    label: string;
    icon: typeof Home;
    exact?: boolean;
  }) => {
    const active = exact ? path === to : path === to || path.startsWith(to + "/");

    return (
      <Link
        to={to}
        aria-current={active ? "page" : undefined}
        className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold transition-all duration-200 active:scale-95 ${
          active ? "text-primary" : "text-white/75 hover:text-white"
        }`}
      >
        <Icon
          size={22}
          strokeWidth={active ? 2.6 : 2}
          className={active ? "drop-shadow-[0_0_7px_rgba(255,120,0,0.35)]" : ""}
        />
        <span className="leading-none">{label}</span>
        {active && (
          <span className="absolute -bottom-1 h-1 w-8 rounded-full bg-primary" />
        )}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 pointer-events-none"
    >
      <div className="pointer-events-auto relative mx-auto flex max-w-md items-center rounded-[26px] border border-white/10 bg-[#071735]/95 px-2 py-2 shadow-[0_12px_35px_rgba(4,12,30,0.35)] backdrop-blur-xl">
        {left.map((item) => (
          <Item key={item.to} {...item} />
        ))}

        {/* Elevated center cart action */}
        <div className="relative flex w-[68px] shrink-0 items-center justify-center">
          <Link
            to="/cart"
            aria-label={`Shopping cart${mounted && count > 0 ? `, ${count} items` : ""}`}
            aria-current={path === "/cart" ? "page" : undefined}
            className="absolute -top-7 flex h-[58px] w-[58px] items-center justify-center rounded-full bg-gradient-to-br from-[#ff8a00] to-[#ff5a00] text-white shadow-[0_7px_20px_rgba(255,105,0,0.45)] ring-[5px] ring-[#071735] transition-transform active:scale-95"
          >
            <ShoppingBag size={25} strokeWidth={2.4} />
            {mounted && count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-[#071735]">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
          <span className="mt-7 text-[10px] font-semibold leading-none text-white">
            Cart
          </span>
        </div>

        {right.map((item) => (
          <Item key={item.to} {...item} />
        ))}

        {showInstall && <InstallAppButton variant="nav" />}
      </div>
    </nav>
  );
}
