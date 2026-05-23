import { ArrowLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";

export function PageHeader({ title }: { title: string }) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-3 px-4 py-4 bg-background border-b border-border">
      <button onClick={() => router.history.back()} aria-label="Back">
        <ArrowLeft size={22} />
      </button>
      <h1 className="text-xl font-semibold">{title}</h1>
    </div>
  );
}
