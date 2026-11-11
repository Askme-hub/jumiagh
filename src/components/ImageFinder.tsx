import { useEffect, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

type Hit = { id: string; thumbnail: string; url: string; title?: string };

export function ImageFinder({ initialQuery, onPick, onClose }: { initialQuery: string; onPick: (url: string) => void; onClose: () => void }) {
  const [q, setQ] = useState(initialQuery);
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const search = async (term: string) => {
    if (!term.trim()) return;
    setLoading(true); setErr("");
    try {
      const r = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(term)}&page_size=24&mature=false`);
      const j = await r.json();
      const list: Hit[] = (j.results ?? []).map((x: { id: string; thumbnail: string; url: string; title?: string }) => ({ id: x.id, thumbnail: x.thumbnail || x.url, url: x.url, title: x.title }));
      setHits(list);
      if (!list.length) setErr("No photos found. Try a shorter name.");
    } catch {
      setErr("Couldn't search right now. Please try again.");
    }
    setLoading(false);
  };

  useEffect(() => { void search(initialQuery); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-foreground/50 md:items-center" onClick={onClose}>
      <div className="flex max-h-[85dvh] w-full max-w-2xl flex-col rounded-t-2xl bg-card md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <p className="font-bold">Find photos online</p>
          <button type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <form className="flex gap-2 p-4" onSubmit={(e) => { e.preventDefault(); void search(q); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Infinix Hot 40" className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <button className="flex items-center gap-1 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"><Search size={16} /> Search</button>
        </form>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
          ) : err ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{err}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {hits.map((h) => (
                <button key={h.id} type="button" onClick={() => onPick(h.url)} className="aspect-square overflow-hidden rounded-lg border border-border bg-muted hover:border-primary">
                  <img src={h.thumbnail} alt={h.title ?? ""} loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">Tap a photo to add it. Real photos of your own item build more trust with buyers.</p>
        </div>
      </div>
    </div>
  );
}
