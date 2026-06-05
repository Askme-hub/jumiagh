import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Pencil, X, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCategories, CATEGORIES_KEY, type Category } from "@/lib/categories";

export const Route = createFileRoute("/admin/categories")({ component: AdminCategories });

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function AdminCategories() {
  const qc = useQueryClient();
  const { data: categories = [], isLoading } = useCategories();
  const [editing, setEditing] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const startCreate = () => {
    setEditing(null);
    setName("");
    setImageUrl("");
    setOpen(true);
  };

  const startEdit = (c: Category) => {
    setEditing(c);
    setName(c.name);
    setImageUrl(c.image_url ?? "");
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name is required");
    setBusy(true);
    const payload = {
      name: name.trim(),
      slug: slugify(name),
      image_url: imageUrl.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("categories").update(payload).eq("id", editing.id)
      : await supabase
          .from("categories")
          .insert({ ...payload, sort_order: categories.length + 1 });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Category updated" : "Category added");
    setOpen(false);
    qc.invalidateQueries({ queryKey: CATEGORIES_KEY });
  };

  const remove = async (c: Category) => {
    if (!confirm(`Delete "${c.name}"?`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: CATEGORIES_KEY });
  };

  return (
    <div>
      <div className="p-3 flex items-center justify-between border-b border-border">
        <p className="text-sm font-bold text-foreground">Manage Categories</p>
        <button
          onClick={startCreate}
          className="bg-primary text-primary-foreground px-3 py-2 rounded text-sm font-bold flex items-center gap-1"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-foreground/10 animate-pulse" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm font-semibold text-foreground">No categories yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add your first category to get started.</p>
        </div>
      ) : (
        <div className="md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3 md:p-3">
          {categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 p-3 bg-card border-b md:border md:rounded-lg border-border"
            >
              <GripVertical size={16} className="text-muted-foreground shrink-0" />
              <div className="w-10 h-10 rounded bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                {c.image_url ? (
                  <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-muted-foreground">
                    {c.name.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground truncate">{c.slug}</p>
              </div>
              <button onClick={() => startEdit(c)} className="p-2 text-primary">
                <Pencil size={16} />
              </button>
              <button onClick={() => remove(c)} className="p-2 text-destructive">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 bg-foreground/40 flex items-end md:items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-background w-full max-w-md rounded-t-xl md:rounded-xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-lg text-foreground">
                {editing ? "Edit" : "New"} Category
              </h2>
              <button onClick={() => setOpen(false)} className="text-foreground">
                <X />
              </button>
            </div>
            <form onSubmit={save} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Electronics"
                  className="mt-1 w-full border border-input bg-background text-foreground rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Image URL (optional)
                </label>
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://…"
                  className="mt-1 w-full border border-input bg-background text-foreground rounded px-3 py-2 text-sm"
                />
              </div>
              <button
                disabled={busy}
                className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-md disabled:opacity-60"
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
