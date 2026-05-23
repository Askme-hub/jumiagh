import { Search, ArrowLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";

export function SearchBar({ back = false }: { back?: boolean }) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-background">
      {back && (
        <button onClick={() => router.history.back()} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
      )}
      <div className="flex-1 flex items-center gap-2 bg-muted rounded-md px-3 py-2.5">
        <Search size={18} className="text-muted-foreground" />
        <input
          className="bg-transparent outline-none text-sm flex-1 placeholder:text-muted-foreground"
          placeholder="Search on Jumia"
        />
      </div>
    </div>
  );
}
