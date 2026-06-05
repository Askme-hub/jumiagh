import { Search, X, ArrowRight } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useSearchUI } from "@/lib/search-ui";

const TRENDING = ["iPhone", "Sneakers", "PlayStation", "Smart TV", "AirPods"];

export function SearchOverlay() {
  const { open, setOpen } = useSearchUI();
  const router = useRouter();
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // focus + lock scroll when open
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
      return () => {
        clearTimeout(t);
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  // close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  if (!open) return null;

  const submit = (q: string) => {
    const term = q.trim();
    if (!term) return;
    setOpen(false);
    setValue("");
    router.navigate({ to: "/search", search: { q: term } });
  };

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="relative bg-background border-b border-border shadow-lg animate-in slide-in-from-top duration-200">
        <div className="max-w-md md:max-w-3xl mx-auto px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(value);
            }}
            className="flex items-center gap-3 rounded-2xl border border-input bg-muted px-4 py-3 focus-within:border-primary focus-within:bg-background transition"
          >
            <Search size={20} className="text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Search on Kivora"
              className="flex-1 bg-transparent outline-none text-sm font-medium text-foreground placeholder:text-muted-foreground"
            />
            {value ? (
              <button
                type="button"
                onClick={() => setValue("")}
                aria-label="Clear"
                className="w-7 h-7 rounded-full bg-foreground/10 hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition"
              >
                <X size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close search"
                className="text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              aria-label="Search"
              className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 active:scale-95 transition"
            >
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="mt-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Trending
            </p>
            <div className="flex flex-wrap gap-2">
              {TRENDING.map((t) => (
                <button
                  key={t}
                  onClick={() => submit(t)}
                  className="px-3 py-1.5 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground text-xs font-medium text-foreground transition"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
