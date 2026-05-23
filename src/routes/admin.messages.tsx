import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/messages")({ component: AdminMessages });

function AdminMessages() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", body: "", userEmail: "" });

  const { data: messages } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inbox_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const send = async () => {
    if (!form.title || !form.body) return toast.error("Title and body required");
    let user_id: string | null = null;
    if (form.userEmail.trim()) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", form.userEmail.trim())
        .maybeSingle();
      if (!prof) return toast.error("User not found");
      user_id = prof.id;
    }
    const { error } = await supabase.from("inbox_messages").insert({
      title: form.title,
      body: form.body,
      user_id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(user_id ? "Sent" : "Broadcast sent to all users");
      setForm({ title: "", body: "", userEmail: "" });
      qc.invalidateQueries({ queryKey: ["admin-messages"] });
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("inbox_messages").delete().eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["admin-messages"] });
  };

  return (
    <div>
      <div className="p-3 bg-card border-b border-border space-y-2">
        <h2 className="font-bold">Send message</h2>
        <input placeholder="Recipient email (blank = broadcast)" value={form.userEmail}
          onChange={(e) => setForm({ ...form, userEmail: e.target.value })}
          className="w-full border rounded px-3 py-2 text-sm" />
        <input placeholder="Title" value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full border rounded px-3 py-2 text-sm" />
        <textarea placeholder="Body" value={form.body} rows={3}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          className="w-full border rounded px-3 py-2 text-sm" />
        <button onClick={send} className="w-full bg-primary text-primary-foreground font-bold py-2.5 rounded">Send</button>
      </div>

      <p className="p-3 text-sm text-muted-foreground">{messages?.length ?? 0} messages</p>
      {messages?.map((m: any) => (
        <div key={m.id} className="p-3 bg-card border-b border-border flex gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-bold">{m.title}</p>
            <p className="text-xs text-muted-foreground">
              {m.user_id ? "Direct" : "Broadcast"} · {new Date(m.created_at).toLocaleDateString()}
            </p>
            <p className="text-sm mt-1 line-clamp-2">{m.body}</p>
          </div>
          <button onClick={() => remove(m.id)} className="text-destructive p-2"><Trash2 size={16} /></button>
        </div>
      ))}
    </div>
  );
}
