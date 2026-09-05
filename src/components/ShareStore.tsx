import { useState } from "react";
import { Share2, Copy, Check, X } from "lucide-react";
import { toast } from "sonner";

export function ShareStore({ shopName, url }: { shopName: string; url: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const message = `🛍️ Check out ${shopName} on Kivora Ghana.\nShop products and services from this store:\n${url}\n\nKivora — Buy. Sell. Grow.`;

  const share = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `${shopName} — Kivora Ghana`, text: message, url });
        return;
      } catch {
        /* user cancelled — fall through to the sheet */
      }
    }
    setOpen(true);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Store link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link");
    }
  };

  return (
    <>
      <button
        onClick={share}
        className="inline-flex items-center gap-2 rounded-full gradient-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-soft transition active:scale-95"
      >
        <Share2 size={16} /> Share store
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl bg-card p-5 shadow-elevated sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Share {shopName}</h3>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-1 text-muted-foreground hover:bg-muted">
                <X size={18} />
              </button>
            </div>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success/15 text-success">W</span>
              Share on WhatsApp
            </a>

            <button
              onClick={copy}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </span>
              {copied ? "Link copied" : "Copy store link"}
            </button>

            <p className="mt-3 break-all rounded-xl bg-muted px-3 py-2 text-[11px] text-muted-foreground">{url}</p>
          </div>
        </div>
      )}
    </>
  );
}
