import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CARD_THEMES, canvasToBlob, downloadBlob, renderShopCard, type CardFormat, type CardShop, type CardTheme } from "@/lib/shop-card";

/** Pick a format + theme, preview it live, and download a PNG. */
export function ShopCardStudio({ shop }: { shop: CardShop }) {
  const [format, setFormat] = useState<CardFormat>("card");
  const [theme, setTheme] = useState<CardTheme>("orange");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setBlob(null);
    renderShopCard(shop, format, theme)
      .then(canvasToBlob)
      .then((b) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(b);
        setBlob(b);
        setPreview(objectUrl);
      })
      .catch(() => !cancelled && toast.error("Couldn't build the card"));
    return () => {
      cancelled = true;
      if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl!), 1000);
    };
  }, [shop, format, theme]);

  const pill = (active: boolean) =>
    `rounded-full px-4 py-2 text-xs font-bold transition ${active ? "gradient-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={pill(format === "card")} onClick={() => setFormat("card")}>Business card</button>
        <button type="button" className={pill(format === "flyer")} onClick={() => setFormat("flyer")}>Social flyer</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(CARD_THEMES) as CardTheme[]).map((k) => (
          <button type="button" key={k} className={pill(theme === k)} onClick={() => setTheme(k)}>
            {CARD_THEMES[k].label}
          </button>
        ))}
      </div>
      <div className="grid place-items-center rounded-2xl border border-border bg-muted/40 p-3">
        {preview ? (
          <img
            src={preview}
            alt={`${shop.shop_name} ${format === "card" ? "business card" : "flyer"} preview`}
            className={`rounded-xl shadow-soft ${format === "card" ? "w-full max-w-md" : "max-h-[60vh] w-auto"}`}
          />
        ) : (
          <div className="grid h-48 place-items-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
        )}
      </div>
      <button
        type="button"
        disabled={!blob}
        onClick={() => blob && downloadBlob(blob, `${shop.slug}-kivora-${format}.png`)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full gradient-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        <Download size={16} /> Download {format === "card" ? "business card" : "flyer"}
      </button>
    </div>
  );
}
