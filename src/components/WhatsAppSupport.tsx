import { useRouterState } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

// Kivora customer care WhatsApp number (international format, digits only).
export const SUPPORT_WHATSAPP = "233257573471";

const HIDDEN = ["/checkout", "/messages", "/login", "/payment"];

export function WhatsAppSupport() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (HIDDEN.some((p) => path.startsWith(p))) return null;
  const text = encodeURIComponent(`Hi Kivora, I need help${path.startsWith("/products/") ? ` with this item: https://kivoragh.shop${path}` : ""}`);
  return (
    <a
      href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Kivora support on WhatsApp"
      className="fixed right-4 bottom-20 md:bottom-6 z-40 flex items-center gap-2 rounded-full bg-success-ink text-background shadow-lg px-4 py-3 text-sm font-semibold hover:opacity-90 print:hidden"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline">Need help?</span>
    </a>
  );
}
