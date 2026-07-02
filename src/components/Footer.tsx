import { Link, useRouterState } from "@tanstack/react-router";
import { Facebook, Instagram, Twitter, Youtube, Phone, Mail, MapPin } from "lucide-react";
import kivoraIcon from "@/assets/kivora-icon.png";

const cols = [
  {
    title: "Help",
    links: [
      { to: "/", label: "Help Center" },
      { to: "/orders", label: "Track Order" },
      { to: "/account", label: "My Account" },
      { to: "/seller", label: "Sell on Kivora" },
    ],
  },
  {
    title: "Policies",
    links: [
      { to: "/", label: "Terms of Service" },
      { to: "/", label: "Privacy Policy" },
      { to: "/", label: "Return Policy" },
      { to: "/", label: "Shipping Info" },
    ],
  },
] as const;

const socials = [
  { label: "Facebook", icon: Facebook, href: "https://facebook.com" },
  { label: "Instagram", icon: Instagram, href: "https://instagram.com" },
  { label: "Twitter", icon: Twitter, href: "https://twitter.com" },
  { label: "YouTube", icon: Youtube, href: "https://youtube.com" },
];

export function Footer() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (path === "/login") return null;

  return (
    <footer className="mt-auto border-t border-border bg-card text-card-foreground">
      <div className="max-w-7xl mx-auto px-5 py-10 grid gap-8 grid-cols-2 md:grid-cols-5">
        {/* Brand */}
        <div className="col-span-2 md:col-span-2">
          <Link to="/" className="flex items-center gap-2">
            <img src={kivoraIcon} alt="Kivora" className="w-9 h-9 rounded-lg" />
            <span className="text-xl font-extrabold tracking-tight text-primary">Kivora</span>
          </Link>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">
            Ghana's modern marketplace. Shop everything you need with fast delivery and secure payments.
          </p>
          <div className="mt-4 flex items-center gap-3">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <s.icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Link groups */}
        {cols.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-bold text-foreground">{col.title}</h3>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Contact */}
        <div className="col-span-2 md:col-span-1">
          <h3 className="text-sm font-bold text-foreground">Contact</h3>
          <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Phone className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <span>025 757 3471</span>
            </li>
             <li className="flex items-start gap-2">
              <Phone className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <span>055 247 4242</span>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <span>support@kivora.gh</span>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <span>Accra, Ghana</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-5 py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Kivora Ghana. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
