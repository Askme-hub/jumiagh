import { useState } from "react";
import { BadgeCheck, X } from "lucide-react";

const EXPLANATION =
  "Kivora Verified means this seller has completed Kivora's verification process.";

export function VerifiedBadge({
  size = "sm",
  explainable = false,
}: {
  size?: "sm" | "md";
  explainable?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const cls =
    size === "md"
      ? "gap-1.5 px-2.5 py-1 text-[11px]"
      : "gap-1 px-2 py-0.5 text-[10px]";

  const badge = (
    <span
      className={`inline-flex items-center rounded-full bg-primary-soft font-bold uppercase tracking-wide text-primary ${cls}`}
    >
      <BadgeCheck size={size === "md" ? 14 : 12} /> Kivora Verified
    </span>
  );

  if (!explainable) return badge;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="What is Kivora Verified?"
        className="transition active:scale-95"
      >
        {badge}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-sm rounded-t-3xl border border-border/60 bg-card p-5 shadow-elevated sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="inline-flex items-center gap-2 text-base font-extrabold text-foreground">
                <BadgeCheck size={18} className="text-primary" /> Kivora Verified
              </h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-full bg-muted p-1.5 text-muted-foreground"
              >
                <X size={16} />
              </button>
            </div>
            <p className="mt-3 text-sm leading-5 text-muted-foreground">{EXPLANATION}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Verification may cover business or store information, contact details, seller
              identity or business information where appropriate, product information, seller
              activity and compliance with Kivora marketplace policies.
            </p>
            <button
              onClick={() => setOpen(false)}
              className="mt-5 w-full rounded-full gradient-primary py-2.5 text-sm font-bold text-primary-foreground"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
