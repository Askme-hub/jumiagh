import { Search, ArrowLeft, X } from "lucide-react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export function SearchBar({ back = false }: { back?: boolean }) {
  const router = useRouter();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const searchParam = useRouterState({
    select: (s) => (s.location.search as { q?: string })?.q ?? "",
  });
  const [value, setValue] = useState(searchParam);

  useEffect(() => {
    setValue(searchParam);
  }, [searchParam]);

  // debounce live navigation to /search?q=
  useEffect(() => {
    if (path !== "/search" && value.trim().length === 0) return;
    const id = setTimeout(() => {
      const q = value.trim();
      if (path === "/search") {
        router.navigate({ to: "/search", search: { q } });
      } else if (q.length > 0) {
        router.navigate({ to: "/search", search: { q } });
      }
    }, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

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
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="bg-transparent outline-none text-sm flex-1 placeholder:text-muted-foreground"
          placeholder="Search on Jumia"
        />
        {value && (
          <button onClick={() => setValue("")} aria-label="Clear">
            <X size={16} className="text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}
