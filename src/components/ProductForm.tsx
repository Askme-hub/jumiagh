import { useState, useRef } from "react";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial?.price ? String(initial.price) : "");
  const [oldPrice, setOldPrice] = useState(initial?.old_price ? String(initial.old_price) : "");
  const [stock, setStock] = useState(initial?.stock ? String(initial.stock) : "0");
  const [discount, setDiscount] = useState(initial?.discount ? String(initial.discount) : "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const uploadFile = async (file: File) => {
    if (!user) return toast.error("Login required");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: false });
    if (error) {
      setUploading(false);
      return toast.error(error.message);
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setImageUrl(data.publicUrl);
    setUploading(false);
    toast.success("Image uploaded");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) return toast.error("Name and price are required");
    if (!user) return toast.error("Login required");

    setBusy(true);
    const payload: any = {
      name: name.trim(),
      description: description || null,
      price: Number(price),
      old_price: oldPrice ? Number(oldPrice) : null,
      image_url: imageUrl || null,
      stock: Number(stock) || 0,
      discount: discount ? Number(discount) : null,
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
    toast.success("Saved");
    onSaved?.();
  };

  return (
    <form onSubmit={save} className="space-y-3">
      <div>
        <label className="text-xs font-semibold text-muted-foreground">Product image</label>
        <div className="mt-1 flex items-center gap-3">
          {imageUrl ? (
            <div className="relative w-24 h-24 rounded-lg border border-border overflow-hidden bg-muted">
              <img src={imageUrl} alt="" className="w-full h-full object-contain" />
              <button
                type="button"
                onClick={() => setImageUrl("")}
                className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-24 h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-xs text-muted-foreground hover:border-primary"
            >
              <Upload size={20} />
              {uploading ? "Uploading…" : "Upload"}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
          />
          <div className="flex-1">
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="…or paste image URL"
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <Input label="Name *" value={name} onChange={setName} />
      <div className="grid grid-cols-2 gap-2">
        <Input label="Price (GHC) *" value={price} onChange={setPrice} type="number" />
        <Input label="Old price" value={oldPrice} onChange={setOldPrice} type="number" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input label="Stock" value={stock} onChange={setStock} type="number" />
        <Input label="Discount %" value={discount} onChange={setDiscount} type="number" />
      </div>
      <Input label="Category" value={category} onChange={setCategory} placeholder="e.g. Electronics" />
      <div>
        <label className="text-xs font-semibold text-muted-foreground">Description</label>
        <textarea
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="mt-1 w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      <button disabled={busy || uploading} className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-md disabled:opacity-60">
        {busy ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

function Input({
  label, value, onChange, type = "text", placeholder,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full border rounded px-3 py-2 text-sm"
      />
    </div>
  );
}
