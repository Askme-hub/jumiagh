import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { MessagesPage } from "@/components/MessagesPage";

export const Route = createFileRoute("/seller/messages")({
  component: SellerMessages,
  validateSearch: (s: Record<string, unknown>) => ({ c: typeof s.c === "string" ? s.c : undefined }),
  head: () => ({
    meta: [
      { title: "Customer Messages — Kivora Seller" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function SellerMessages() {
  const { user, loading } = useAuth();
  const { c } = Route.useSearch();
  if (loading || !user) return null;
  return <MessagesPage userId={user.id} initialConversationId={c} />;
}
