import { Link, useRouterState, useRouter } from "@tanstack/react-router";
import {
  Home,
  LayoutGrid,
  ShoppingCart,
  Heart,
  UserCircle2,
  Package,
  Store,
  Shield,
  Menu,
  LogOut,
  LogIn,
  Wallet,
  Mail,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useShop } from "@/lib/store";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { useIsSeller } from "@/hooks/use-seller";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import kivoraIcon from "@/assets/kivora-icon.png";

const mainItems = [
  { to: "/" as const, label: "Home", icon: Home, exact: true },
  { to: "/categories" as const, label: "Categories", icon: LayoutGrid },
  { to: "/orders" as const, label: "My Orders", icon: Package },
  { to: "/wishlist" as const, label: "Wishlist", icon: Heart },
  { to: "/inbox" as const, label: "Inbox", icon: Mail },
  { to: "/cart" as const, label: "Cart", icon: ShoppingCart },
  { to: "/account" as const, label: "Account", icon: UserCircle2 },
];

export function AppDrawer() {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin(user);
  const { data: isSeller } = useIsSeller(user);

  // close on route change
  useEffect(() => {
    setOpen(false);
  }, [path]);

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    setOpen(false);
    router.navigate({ to: "/login" });
  };

  const NavLink = ({
    to,
    label,
    icon: Icon,
    active,
  }: {
    to: string;
    label: string;
    icon: typeof Home;
    active: boolean;
  }) => (
    <Link
      to={to}
      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
        active
          ? "bg-primary/10 text-primary"
          : "text-foreground/80 hover:bg-muted"
      }`}
    >
      <Icon size={20} strokeWidth={active ? 2.4 : 1.9} />
      {label}
    </Link>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="Open menu"
          className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-foreground active:scale-95 transition"
        >
          <Menu size={22} />
        </button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="w-[82%] max-w-xs p-0 flex flex-col bg-background"
      >
        {/* Brand header */}
        <div className="bg-primary text-primary-foreground p-5 flex items-center gap-3">
          <img src={kivoraIcon} alt="Kivora" className="w-11 h-11 rounded-xl" />
          <div className="flex-1 min-w-0">
            <p className="text-lg font-extrabold leading-tight">Kivora</p>
            <p className="text-xs opacity-90 truncate">
              {user ? user.email : "Welcome, guest"}
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {mainItems.map(({ to, label, icon, exact }) => {
            const active = exact ? path === to : path.startsWith(to);
            return (
              <NavLink key={to} to={to} label={label} icon={icon} active={active} />
            );
          })}

          {isSeller && (
            <>
              <p className="px-3 pt-4 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Seller
              </p>
              <NavLink
                to="/seller"
                label="Seller Hub"
                icon={Store}
                active={path.startsWith("/seller")}
              />
              <NavLink
                to="/seller/wallet"
                label="Wallet"
                icon={Wallet}
                active={path.startsWith("/seller/wallet")}
              />
            </>
          )}

          {isAdmin && (
            <>
              <p className="px-3 pt-4 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Admin
              </p>
              <NavLink
                to="/admin"
                label="Admin Panel"
                icon={Shield}
                active={path.startsWith("/admin")}
              />
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-3">
          {user ? (
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-destructive hover:bg-destructive/10 transition"
            >
              <LogOut size={20} /> Logout
            </button>
          ) : (
            <Link
              to="/login"
              className="flex w-full items-center gap-3 rounded-xl bg-primary px-3 py-3 text-sm font-bold text-primary-foreground"
            >
              <LogIn size={20} /> Log in / Sign up
            </Link>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Mobile top bar with hamburger + brand + cart. */
export function MobileTopBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const count = useShop((s) => s.cartCount());
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (path === "/login") return null;

  return (
    <header className="md:hidden z-40 bg-background border-b border-border px-3 py-2.5 flex items-center gap-3">
      <AppDrawer />
      <Link to="/" className="flex items-center gap-2 flex-1 min-w-0">
        <img src={kivoraIcon} alt="Kivora" className="w-8 h-8 rounded-lg" />
        <span className="text-lg font-extrabold tracking-tight text-primary">
          Kivora
        </span>
      </Link>
      <Link
        to="/cart"
        aria-label="Cart"
        className="relative w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-foreground active:scale-95 transition"
      >
        <ShoppingCart size={20} />
        {mounted && count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {count}
          </span>
        )}
      </Link>
    </header>
  );
}
