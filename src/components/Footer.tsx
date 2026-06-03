import { Link, useRouterState } from "@tanstack/react-router";
import kivoraIcon from "@/assets/kivora-icon.png";

const cols = [
  {
    title: "Shop",
    links: [
      { to: "/", label: "Home" },
      { to: "/categories", label: "Categories" },
      { to: "/wishlist", label: "Wishlist" },
      { to: "/cart", label: "Cart" },
    ],
  },
  {
    title: "Account",
    links: [
      { to: "/account", label: "My Account" },
      { to: "/orders", label: "My Orders" },
      { to: "/inbox", label: "Inbox" },
      { to: "/seller", label: "Sell on Kivora" },
    ],
  },
];

export function Footer() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (path === "/login") return null;

  return (
    <footer className="mt-10 border-t border-border bg-card text-card-foreground">
      <div className="max-w-7xl mx-auto px-5 py-10 grid gap-8 sm:grid-cols-2 md:grid-cols-4">
        <div className="col-span-2 md:col-span-2">
          <Link to="/" className="flex items-center gap-2">
            <img src={kivoraIcon} alt="Kivora" className="w-9 h-9 rounded-lg" />
            <span className="text-xl font-extrabold tracking-tight text-primary">Kivora</span>
          </Link>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">
            Ghana's modern marketplace. Shop everything you need with fast delivery and secure payments.
          </p>
          <p className="mt-3 text-sm font-semibold text-foreground">Support: 025 757 3471</p>
        </div>

        {cols.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-bold text-foreground">{col.title}</h3>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    className="text-sm text-muted-foreground hover:text-primary transition"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-5 py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Kivora Ghana. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
