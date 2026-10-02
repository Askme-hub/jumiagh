import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { MessagesPage } from "@/components/MessagesPage";

export const Route = createFileRoute("/seller/messages")({
  component: SellerMessages,
  head: () => ({
    meta: [
      { title: "Customer Messages — Kivora Seller" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function SellerMessages() {
  const { user, loading } = useAuth();
  if (loading || !user) return null;
  return <MessagesPage userId={user.id} />;
}
