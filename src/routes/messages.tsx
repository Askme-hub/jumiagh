import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MessagesPage } from "@/components/MessagesPage";

export const Route = createFileRoute("/messages")({
  component: MessagesRoute,
  validateSearch: (s: Record<string, unknown>) => ({ c: typeof s.c === "string" ? s.c : undefined }),
  head: () => ({
    meta: [
      { title: "Messages — Kivora Ghana" },
      { name: "description", content: "Chat with sellers on Kivora Ghana." },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
});

function MessagesRoute() {
  const { user, loading } = useAuth();
  const { c } = Route.useSearch();
  if (loading || !user) return null;
  return <MessagesPage userId={user.id} initialConversationId={c} />;
}
