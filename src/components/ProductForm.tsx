import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, X, ImagePlus, Loader2, ChevronDown, Check } from "lucide-react";
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
  stock?: number;
  discount?: number | null;
  category?: string | null;
  approval_status?: string;
};

const MAX_MB = 5;

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

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : "");
  const [oldPrice, setOldPrice] = useState(initial?.old_price != null ? String(initial.old_price) : "");
  const [stock, setStock] = useState(initial?.stock != null ? String(initial.stock) : "1");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
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

  const uploadFile = async (file: File) => {
    if (!user) return toast.error("Please log in first");
    if (!file.type.startsWith("image/")) return toast.error("That file is not an image");
    if (file.size > MAX_MB * 1024 * 1024) return toast.error(`Image must be under ${MAX_MB}MB`);
    setUploading(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/products/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, file, { upsert: false, contentType: file.type });
    if (error) {
      setUploading(false);
      return toast.error(error.message);
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setImageUrl(data.publicUrl);
    setErrors((e) => ({ ...e, image: "" }));
    setUploading(false);
    toast.success("Photo added");
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
    const payload: Record<string, unknown> = {
      name: name.trim(),
      description: description?.trim() || null,
      price: Number(price),
      old_price: oldPrice.trim() ? Number(oldPrice) : null,
      image_url: imageUrl.trim() || null,
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
      : await supabase.from("products").insert(payload as never);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(initial?.id ? "Product updated" : "Product submitted for approval");
    onSaved?.();
  };

  return (
    <form onSubmit={save} className="space-y-5">
      {/* Step 1 — photo */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <StepLabel n={1} title="Add a photo" hint="Optional, but products with photos sell far better" />
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void uploadFile(f);
          }}
          className={`mt-3 rounded-xl border-2 border-dashed transition ${
            dragging ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          {imageUrl ? (
            <div className="flex items-center gap-4 p-3">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                <img src={imageUrl} alt="Product preview" className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 text-sm font-semibold text-green-600">
                  <Check size={14} /> Photo ready
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-destructive"
                  >
                    <X size={12} /> Remove
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex w-full flex-col items-center justify-center gap-1 px-4 py-8 text-muted-foreground disabled:opacity-60"
            >
              {uploading ? <Loader2 size={26} className="animate-spin" /> : <ImagePlus size={26} />}
              <span className="text-sm font-semibold text-foreground">
                {uploading ? "Uploading…" : "Tap to upload a photo"}
              </span>
              <span className="text-xs">Drag & drop or browse · JPG/PNG up to {MAX_MB}MB</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadFile(f);
              e.target.value = "";
            }}
          />
        </div>
        {!imageUrl && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setShowUrl((v) => !v)}
              className="text-xs font-semibold text-primary"
            >
              {showUrl ? "Hide link option" : "Use an image link instead"}
            </button>
            {showUrl && (
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…"
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            )}
          </div>
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

export { Upload };
