import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { X, ImagePlus, Loader2, ChevronDown, Camera, Globe, Star } from "lucide-react";
import { ImageFinder } from "@/components/ImageFinder";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCategories } from "@/lib/categories";
import { formatGHC } from "@/lib/store";

type ProductRow = {
  id?: string;
  name?: string;
  description?: string | null;
  price?: number | string;
  old_price?: number | string | null;
  image_url?: string | null;
  image_urls?: string[] | null;
  stock?: number;
  discount?: number | null;
  category?: string | null;
  approval_status?: string;
};

const MAX_MB = 5;
const MAX_PHOTOS = 8;

export function ProductForm({
  initial,
  onSaved,
  asAdmin = false,
}: {
  initial?: ProductRow;
  onSaved?: () => void;
  asAdmin?: boolean;
}) {
  const { user } = useAuth();
  const { data: categories = [] } = useCategories();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [finder, setFinder] = useState(false);

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : "");
  const [oldPrice, setOldPrice] = useState(initial?.old_price != null ? String(initial.old_price) : "");
  const [stock, setStock] = useState(initial?.stock != null ? String(initial.stock) : "1");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [images, setImages] = useState<string[]>(() => {
    const list = initial?.image_urls?.length ? [...initial.image_urls] : [];
    if (initial?.image_url && !list.includes(initial.image_url)) list.unshift(initial.image_url);
    return list;
  });
  const [linkUrl, setLinkUrl] = useState("");
  const addImage = (u: string) => setImages((l) => (l.includes(u) || l.length >= MAX_PHOTOS ? l : [...l, u]));
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-derive the discount badge from price vs. old price — no manual math.
  const discount = useMemo(() => {
    const p = Number(price);
    const o = Number(oldPrice);
    if (!p || !o || o <= p) return null;
    return Math.round(((o - p) / o) * 100);
  }, [price, oldPrice]);

  useEffect(() => {
    if (initial?.old_price || initial?.description || (initial?.stock ?? 1) !== 1) setShowMore(true);
  }, [initial]);

  const uploadFiles = async (files: File[]) => {
    const room = MAX_PHOTOS - images.length;
    if (room <= 0) return toast.error(`Up to ${MAX_PHOTOS} photos`);
    for (const f of files.slice(0, room)) await uploadFile(f);
  };

  const uploadFile = async (file: File) => {
    if (!user) return toast.error("Please log in first");
    if (!file.type.startsWith("image/")) return toast.error("That file is not an image");
    if (file.size > MAX_MB * 1024 * 1024) return toast.error(`Image must be under ${MAX_MB}MB`);
    setUploading(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/products/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, file, { upsert: false, contentType: file.type });
    if (error) {
      setUploading(false);
      return toast.error(error.message);
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    addImage(data.publicUrl);
    setUploading(false);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Give your product a name";
    else if (name.trim().length > 120) e.name = "Keep the name under 120 characters";
    const p = Number(price);
    if (!price.trim()) e.price = "Enter a price";
    else if (!Number.isFinite(p) || p <= 0) e.price = "Price must be greater than 0";
    if (oldPrice.trim()) {
      const o = Number(oldPrice);
      if (!Number.isFinite(o) || o <= 0) e.oldPrice = "Enter a valid amount";
      else if (o <= p) e.oldPrice = "Old price should be higher than the price";
    }
    const s = Number(stock || 0);
    if (!Number.isInteger(s) || s < 0) e.stock = "Stock must be a whole number";
    if ((description ?? "").length > 2000) e.description = "Description is too long";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!user) return toast.error("Please log in first");
    if (uploading) return toast.error("Wait for the photo to finish uploading");
    if (!validate()) return toast.error("Please fix the highlighted fields");

    setBusy(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      name: name.trim(),
      description: description?.trim() || null,
      price: Number(price),
      old_price: oldPrice.trim() ? Number(oldPrice) : null,
      image_url: images[0] ?? null,
      image_urls: images,
      stock: Number(stock || 0),
      discount,
      category: category || null,
    };
    if (!initial?.id) {
      payload.seller_id = asAdmin ? null : user.id;
      payload.approval_status = asAdmin ? "approved" : "pending";
    }
    const { error } = initial?.id
      ? await supabase.from("products").update(payload).eq("id", initial.id)
      : await supabase.from("products").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(
      asAdmin
        ? initial?.id ? "Product updated" : "Product published"
        : "Saved — an admin will review it before it shows to shoppers",
    );
    onSaved?.();
  };

  return (
    <form onSubmit={save} className="space-y-5">
      {/* Step 1 — photos */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <StepLabel n={1} title="Add photos" hint={`Up to ${MAX_PHOTOS} — front, back, side, packaging. First photo is the cover.`} />
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); void uploadFiles(Array.from(e.dataTransfer.files ?? [])); }}
          className={`mt-3 rounded-xl border-2 border-dashed p-3 transition ${dragging ? "border-primary bg-primary/5" : "border-border"}`}
        >
          {images.length > 0 && (
            <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {images.map((u, k) => (
                <div key={u} className={`relative aspect-square overflow-hidden rounded-xl border-2 bg-muted ${k === 0 ? "border-primary" : "border-border"}`}>
                  <img src={u} alt={`Photo ${k + 1}`} className="h-full w-full object-contain" />
                  {k === 0 ? (
                    <span className="absolute left-1 top-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">Cover</span>
                  ) : (
                    <button type="button" onClick={() => setImages((l) => [u, ...l.filter((x) => x !== u)])} className="absolute left-1 top-1 flex items-center gap-0.5 rounded-full bg-card/90 px-1.5 py-0.5 text-[10px] font-semibold"><Star size={10} /> Cover</button>
                  )}
                  <button type="button" aria-label="Remove photo" onClick={() => setImages((l) => l.filter((x) => x !== u))} className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground"><X size={12} /></button>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button type="button" disabled={uploading || images.length >= MAX_PHOTOS} onClick={() => cameraRef.current?.click()} className="flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              <Camera size={16} /> Take photo
            </button>
            <button type="button" disabled={uploading || images.length >= MAX_PHOTOS} onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold disabled:opacity-60">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />} {uploading ? "Uploading…" : "From gallery"}
            </button>
            <button type="button" disabled={images.length >= MAX_PHOTOS} onClick={() => { if (!name.trim()) return toast.error("Type the product name first (step 2)"); setFinder(true); }} className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold disabled:opacity-60">
              <Globe size={16} /> Find online
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">{images.length}/{MAX_PHOTOS} photos · JPG/PNG up to {MAX_MB}MB each</p>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void uploadFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void uploadFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
        </div>
        <div className="mt-2">
          <button type="button" onClick={() => setShowUrl((v) => !v)} className="text-xs font-semibold text-primary">
            {showUrl ? "Hide link option" : "Paste an image link"}
          </button>
          {showUrl && (
            <div className="mt-2 flex gap-2">
              <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              <button type="button" onClick={() => { if (/^https?:\/\//.test(linkUrl.trim())) { addImage(linkUrl.trim()); setLinkUrl(""); } else toast.error("Enter a valid link"); }} className="rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground">Add</button>
            </div>
          )}
        </div>
        {finder && (
          <ImageFinder initialQuery={name} onClose={() => setFinder(false)} onPick={(u) => { addImage(u); toast.success("Photo added"); }} />
        )}
      </section>

      {/* Step 2 — the essentials */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <StepLabel n={2} title="The basics" hint="Just a name and a price to get started" />
        <div className="mt-3 space-y-3">
          <Field label="Product name" error={errors.name}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="e.g. Nike Air Max 270 — Men's Sneakers"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
            />
          </Field>

          <Field label="Price (GH₵)" error={errors.price}>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base font-semibold"
            />
          </Field>

          <Field label="Category">
            <select
              value={category ?? ""}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground"
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
              {category && !categories.some((c) => c.name === category) && (
                <option value={category}>{category}</option>
              )}
            </select>
          </Field>
        </div>
      </section>

      {/* Step 3 — optional extras */}
      <section className="rounded-2xl border border-border bg-card shadow-soft">
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="flex w-full items-center justify-between p-4"
        >
          <span className="text-sm font-bold">More details (optional)</span>
          <ChevronDown size={18} className={`transition ${showMore ? "rotate-180" : ""}`} />
        </button>
        {showMore && (
          <div className="space-y-3 border-t border-border p-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Old price (GH₵)" error={errors.oldPrice}>
                <input
                  value={oldPrice}
                  onChange={(e) => setOldPrice(e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Was…"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
                />
              </Field>
              <Field label="Stock" error={errors.stock}>
                <input
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  type="number"
                  min="0"
                  step="1"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
                />
              </Field>
            </div>
            {discount != null && (
              <p className="rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
                Shoppers will see a −{discount}% discount badge.
              </p>
            )}
            <Field label="Description" error={errors.description}>
              <textarea
                value={description ?? ""}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Colour, size, condition, what's included…"
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
              />
            </Field>
          </div>
        )}
      </section>

      <div className="sticky bottom-20 md:bottom-4 z-10">
        <button
          disabled={busy || uploading}
          className="w-full rounded-xl bg-primary py-3.5 font-bold text-primary-foreground shadow-lg disabled:opacity-60"
        >
          {busy
            ? "Saving…"
            : initial?.id
              ? "Save changes"
              : `Publish product${Number(price) > 0 ? ` · ${formatGHC(Number(price))}` : ""}`}
        </button>
        {!initial?.id && !asAdmin && (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Your product goes live once an admin approves it.
          </p>
        )}
      </div>
    </form>
  );
}

function StepLabel({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {n}
      </span>
      <div>
        <p className="text-sm font-bold leading-tight">{title}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
