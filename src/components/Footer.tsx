import { Link, useRouterState } from "@tanstack/react-router";
import { Facebook, Instagram, Twitter, Youtube, Phone, Mail, MapPin, Download, Smartphone } from "lucide-react";
import { toast } from "sonner";
import kivoraIcon from "@/assets/kivora-icon.png";
import { useInstallPrompt, setInstallSheetOpen } from "@/lib/pwa";

const cols = [
  {
    title: "Help",
    links: [
      { to: "/help", label: "Help Center" },
      { to: "/orders", label: "Track Order" },
      { to: "/account", label: "My Account" },
      { to: "/seller", label: "Sell on Kivora" },
    ],
  },
  {
    title: "Policies",
    links: [
      { to: "/terms", label: "Terms of Service" },
      { to: "/privacy", label: "Privacy Policy" },
      { to: "/returns", label: "Return Policy" },
      { to: "/shipping", label: "Shipping Info" },
    ],
  },
] as const;

// Social links hidden until official Kivora handles exist. Add entries here to show them.
const socials: { label: string; icon: typeof Facebook; href: string }[] = [];
void Instagram;
void Twitter;
void Youtube;

function comingSoon(store: string) {
  toast.info(`${store} — Coming soon`, {
    description: "We're finishing the app store listing. Install the free web app in the meantime.",
  });
}

/** Official-style Google Play badge (dark) */
function GooglePlayBadge({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 48"
      className={className}
      role="img"
      aria-label="Get it on Google Play"
    >
      <rect width="160" height="48" rx="6" fill="#000" />
      <rect x="0.5" y="0.5" width="159" height="47" rx="5.5" fill="none" stroke="#a6a6a6" strokeWidth="1" />
      {/* Play triangle */}
      <path
        d="M18.5 12.2c-.7-.4-1.5-.4-2.2 0L10 15.8V32.2l6.3 3.6c.7.4 1.5.4 2.2 0l13.2-7.6c.8-.5.8-1.6 0-2.1l-13.2-7.9z"
        fill="#00F076"
      />
      <path d="M10 15.8l15.4 8.9L10 32.2V15.8z" fill="#00D4FF" opacity="0.9" />
      <path d="M10 15.8l6.3-3.6c.7-.4 1.5-.4 2.2 0l13.2 7.9-6.3 3.6L10 15.8z" fill="#FFD400" />
      <path d="M10 32.2l15.4-7.5 6.3 3.6c.8.5.8 1.6 0 2.1l-13.2 7.6c-.7.4-1.5.4-2.2 0L10 32.2z" fill="#FF3A44" />
      <text x="42" y="18" fill="#fff" fontFamily="Arial, sans-serif" fontSize="8" opacity="0.85">
        GET IT ON
      </text>
      <text x="42" y="34" fill="#fff" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="700">
        Google Play
      </text>
    </svg>
  );
}

/** Official-style App Store badge (dark) */
function AppStoreBadge({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 48"
      className={className}
      role="img"
      aria-label="Download on the App Store"
    >
      <rect width="160" height="48" rx="6" fill="#000" />
      <rect x="0.5" y="0.5" width="159" height="47" rx="5.5" fill="none" stroke="#a6a6a6" strokeWidth="1" />
      {/* Apple logo */}
      <path
        d="M28.2 24.8c0-3.2 2.6-4.7 2.7-4.8-1.5-2.2-3.8-2.5-4.6-2.5-1.9-.2-3.8 1.2-4.8 1.2-1 0-2.5-1.1-4.1-1.1-2.1 0-4.1 1.2-5.2 3.1-2.2 3.9-.6 9.6 1.6 12.7 1.1 1.5 2.4 3.2 4.1 3.1 1.6-.1 2.3-1.1 4.2-1.1s2.5 1.1 4.2 1c1.8 0 2.9-1.5 4-3 1.2-1.7 1.7-3.4 1.7-3.5-.1 0-3.3-1.3-3.3-5.1zm-3.1-9.1c.9-1.1 1.5-2.6 1.3-4.1-1.3.1-2.8.9-3.7 1.9-.8.9-1.5 2.4-1.3 3.8 1.4.1 2.8-.7 3.7-1.6z"
        fill="#fff"
      />
      <text x="42" y="18" fill="#fff" fontFamily="Arial, sans-serif" fontSize="8" opacity="0.85">
        Download on the
      </text>
      <text x="42" y="34" fill="#fff" fontFamily="Arial, sans-serif" fontSize="15" fontWeight="700">
        App Store
      </text>
    </svg>
  );
}

export function Footer() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { available, installed, isIOS } = useInstallPrompt();

  if (path === "/login") return null;

  // Hide store + PWA block on seller/admin workspaces (they have their own shell)
  const isWorkspace = path.startsWith("/seller") || path.startsWith("/admin");

  const handlePwaInstall = () => {
    if (installed) {
      toast.success("Kivora is already installed on this device");
      return;
    }
    // Opens the existing install sheet (handles Android prompt + iOS instructions)
    setInstallSheetOpen(true);
  };

  return (
    <footer className="mt-auto border-t border-border bg-card text-card-foreground">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-5 py-10 md:grid-cols-5">
        {/* Brand */}
        <div className="col-span-2 md:col-span-2">
          <Link to="/" className="flex items-center gap-2">
            <img src={kivoraIcon} alt="Kivora" className="h-9 w-9 rounded-lg" />
            <span className="text-xl font-extrabold tracking-tight text-primary">Kivora</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Ghana&apos;s modern marketplace. Shop everything you need with fast delivery and secure
            payments.
          </p>
          <div className={socials.length ? "mt-4 flex items-center gap-3" : "hidden"}>
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
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
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
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>025 757 3471</span>
            </li>
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>055 247 4242</span>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 break-all">support@kivoragh.shop</span>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Accra, Ghana</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Get the app */}
      {!isWorkspace && (
        <div className="border-t border-border bg-muted/30">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-5 px-5 py-8 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3 text-center md:text-left">
              <div className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Get Kivora on your phone</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  App Store &amp; Google Play coming soon. Install the free web app today.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {/* Google Play — coming soon */}
              <button
                type="button"
                onClick={() => comingSoon("Google Play")}
                className="transition hover:opacity-90 active:scale-[0.98]"
                aria-label="Get it on Google Play — Coming soon"
              >
                <GooglePlayBadge className="h-11 w-auto" />
              </button>

              {/* App Store — coming soon */}
              <button
                type="button"
                onClick={() => comingSoon("App Store")}
                className="transition hover:opacity-90 active:scale-[0.98]"
                aria-label="Download on the App Store — Coming soon"
              >
                <AppStoreBadge className="h-11 w-auto" />
              </button>

              {/* PWA install — works now */}
              <button
                type="button"
                onClick={handlePwaInstall}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98]"
              >
                <Download className="h-4 w-4 text-primary" />
                {installed
                  ? "App installed"
                  : available || isIOS
                    ? "Install free app"
                    : "Install web app"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-5 py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Kivora Ghana. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
