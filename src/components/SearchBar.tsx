import {
  Search,
  ArrowLeft,
  X,
} from "lucide-react";

import {
  useRouter,
  useRouterState,
} from "@tanstack/react-router";

import { useEffect, useState } from "react";

export function SearchBar({
  back = false,
}: {
  back?: boolean;
}) {
  const router = useRouter();

  const path = useRouterState({
    select: (s) => s.location.pathname,
  });

  const searchParam = useRouterState({
    select: (s) =>
      (s.location.search as { q?: string })?.q ??
      "",
  });

  const [value, setValue] =
    useState(searchParam);

  const [focused, setFocused] =
    useState(false);

  useEffect(() => {
    setValue(searchParam);
  }, [searchParam]);

  // LIVE SEARCH
  useEffect(() => {
    if (
      path !== "/search" &&
      value.trim().length === 0
    )
      return;

    const id = setTimeout(() => {
      const q = value.trim();

      if (path === "/search") {
        router.navigate({
          to: "/search",
          search: { q },
        });
      } else if (q.length > 0) {
        router.navigate({
          to: "/search",
          search: { q },
        });
      }
    }, 250);

    return () => clearTimeout(id);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-zinc-200 px-4 py-3">
      <div className="flex items-center gap-3">
        
        {/* BACK BUTTON */}
        {back && (
          <button
            onClick={() =>
              router.history.back()
            }
            aria-label="Back"
            className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center shadow-md active:scale-95 transition"
          >
            <ArrowLeft size={18} />
          </button>
        )}

        {/* SEARCH BOX */}
        <div
          className={`flex-1 flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300 border ${
            focused
              ? "border-[#ff7a00] shadow-[0_0_0_4px_rgba(255,122,0,0.12)] bg-white"
              : "border-zinc-200 bg-zinc-100"
          }`}
        >
          {/* SEARCH ICON */}
          <div
            className={`transition ${
              focused
                ? "text-[#ff7a00]"
                : "text-zinc-400"
            }`}
          >
            <Search size={20} />
          </div>

          {/* INPUT */}
          <input
            value={value}
            onChange={(e) =>
              setValue(e.target.value)
            }
            onFocus={() =>
              setFocused(true)
            }
            onBlur={() =>
              setFocused(false)
            }
            className="bg-transparent outline-none text-sm flex-1 text-black placeholder:text-zinc-400 font-medium"
            placeholder="Search on Kivora"
          />

          {/* CLEAR */}
          {value && (
            <button
              onClick={() =>
                setValue("")
              }
              aria-label="Clear"
              className="w-7 h-7 rounded-full bg-zinc-200 hover:bg-[#ff7a00] hover:text-white flex items-center justify-center transition"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* TRENDING SEARCHES */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none mt-3">
        {[
          "iPhone",
          "Sneakers",
          "PlayStation",
          "Smart TV",
          "AirPods",
        ].map((item) => (
          <button
            key={item}
            onClick={() =>
              setValue(item)
            }
            className="whitespace-nowrap px-3 py-1.5 rounded-full bg-zinc-100 hover:bg-[#ff7a00] hover:text-white text-xs font-medium text-zinc-700 transition"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
