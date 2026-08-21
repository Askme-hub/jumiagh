import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Pencil, X, Eye, EyeOff, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBanners, BANNERS_KEY, type Banner } from "@/lib/banners";

export const Route = createFileRoute("/admin/banners")({ component: AdminBanners });

function AdminBanners() {
  const qc = useQueryClient();
  const { data: banners = [], isLoading } = useBanners(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: BANNERS_KEY });

  const startCreate = () => {
    setEditing(null);
    setTitle("");
    setSubtitle("");
    setImageUrl("");
    setLinkUrl("");
    setCtaLabel("");
    setSortOrder(banners.length + 1);
    setActive(true);
    setOpen(true);
  };

  const startEdit = (b: Banner) => {
    setEditing(b);
    setTitle(b.title ?? "");
    setSubtitle(b.subtitle ?? "");
    setImageUrl(b.image_url);
    setLinkUrl(b.link_url ?? "");
    setCtaLabel(b.cta_label ?? "");
    setSortOrder(b.sort_order);
    setActive(b.is_active);
    setOpen(true);
  };

  const upload = async (file: File) => {
    setUploading(true);
    const path = `banners/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "")}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    setUploading(false);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setImageUrl(data.publicUrl);
    toast.success("Image uploaded");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) return toast.error("A banner image is required");
    setBusy(true);
    const payload = {
      title: title.trim() || null,
      subtitle: subtitle.trim() || null,
      image_url: imageUrl.trim(),
      link_url: linkUrl.trim() || null,
      cta_label: ctaLabel.trim() || null,
      sort_order: Number(sortOrder) || 0,
      is_active: active,
    };
    const { error } = editing
      ? await supabase.from("banners").update(payload).eq("id", editing.id)
      : await supabase.from("banners").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Banner updated" : "Banner added");
    setOpen(false);
    refresh();
  };

  const toggle = async (b: Banner) => {
    const { error } = await supabase
      .from("banners")
      .update({ is_active: !b.is_active })
      .eq("id", b.id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const remove = async (b: Banner) => {
    if (!confirm("Delete this banner?")) return;
    const { error } = await supabase.from("banners").delete().eq("id", b.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border p-3">
        <div>
          <p className="text-sm font-bold text-foreground">Homepage Banners</p>
          <p className="text-xs text-muted-foreground">Slider ads shown at the top of the store</p>
        </div>
        <button
          onClick={startCreate}
          className="flex items-center gap-1 rounded bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-foreground/10" />
          ))}
        </div>
      ) : banners.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm font-semibold text-foreground">No banners yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add your first advertising slide to get started.
          </p>
        </div>
      ) : (
        <div className="md:grid md:grid-cols-2 md:gap-3 md:p-3">
          {banners.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 border-b border-border bg-card p-3 md:rounded-lg md:border"
            >
              <div className="h-14 w-24 shrink-0 overflow-hidden rounded bg-muted">
                <img src={b.image_url} alt={b.title ?? "Banner"} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {b.title || "Untitled banner"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  #{b.sort_order} · {b.is_active ? "Active" : "Hidden"}
                  {b.link_url ? ` · ${b.link_url}` : ""}
                </p>
              </div>
              <button
                onClick={() => toggle(b)}
                className="p-2 text-muted-foreground"
                aria-label={b.is_active ? "Hide banner" : "Show banner"}
              >
                {b.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              <button onClick={() => startEdit(b)} className="p-2 text-primary" aria-label="Edit">
                <Pencil size={16} />
              </button>
              <button onClick={() => remove(b)} className="p-2 text-destructive" aria-label="Delete">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 md:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-xl bg-background p-4 md:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">
                {editing ? "Edit" : "New"} Banner
              </h2>
              <button onClick={() => setOpen(false)} className="text-foreground">
                <X />
              </button>
            </div>
            <form onSubmit={save} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Banner image</label>
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="Banner preview"
                    className="mt-1 aspect-[5/2] w-full rounded-lg object-cover"
                  />
                )}
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://… or upload below"
                  className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
                <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded border border-dashed border-input py-2 text-xs font-semibold text-muted-foreground">
                  <Upload size={14} />
                  {uploading ? "Uploading…" : "Upload image"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) upload(f);
                    }}
                  />
                </label>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Anniversary Sale"
                  className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Subtitle</label>
                <input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Up to 70% off"
                  className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Button label</label>
                  <input
                    value={ctaLabel}
                    onChange={(e) => setCtaLabel(e.target.value)}
                    placeholder="Shop Now"
                    className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Order</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Link (optional)
                </label>
                <input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="/categories or https://…"
                  className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="h-4 w-4"
                />
                Active (visible on homepage)
              </label>
              <button
                disabled={busy || uploading}
                className="w-full rounded-md bg-primary py-3 font-bold text-primary-foreground disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
