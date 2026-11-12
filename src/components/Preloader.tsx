import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import kivoraIcon from "@/assets/kivora-icon.png";

/**
 * Brand splash shown on first app load. The page renders and loads underneath;
 * the splash fades out once the app is ready (max ~2.5s).
 */
export function Preloader() {
  const [phase, setPhase] = useState<"show" | "fade" | "gone">("show");

  useEffect(() => {
    const start = Date.now();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      const wait = Math.max(0, 700 - (Date.now() - start));
      setTimeout(() => {
        setPhase("fade");
        setTimeout(() => setPhase("gone"), 400);
      }, wait);
    };
    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });
    const cap = setTimeout(finish, 2500);
    return () => {
      clearTimeout(cap);
      window.removeEventListener("load", finish);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-primary transition-opacity duration-400 ${
        phase === "fade" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex h-28 w-28 items-center justify-center rounded-full bg-card shadow-lg animate-pulse">
        <img src={kivoraIcon} alt="" className="h-20 w-20 rounded-full" />
      </div>
      <p className="mt-6 text-3xl font-extrabold uppercase tracking-[0.2em] text-primary-foreground">Kivora★</p>
      <div className="mt-5 h-1 w-36 overflow-hidden rounded-full bg-primary-foreground/25">
        <div className="h-full w-1/3 animate-[kivora-load_1s_ease-in-out_infinite] rounded-full bg-primary-foreground" />
      </div>
    </div>
  );
}

/** Thin orange bar at the top while moving between pages. */
export function RouteProgress() {
  const loading = useRouterState({ select: (s) => s.status === "pending" });
  if (!loading) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[90] h-0.5 overflow-hidden bg-primary/20">
      <div className="h-full w-1/3 animate-[kivora-load_1s_ease-in-out_infinite] bg-primary" />
    </div>
  );
}
