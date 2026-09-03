import type { ReactNode } from "react";

export function InfoPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <main className="max-w-3xl mx-auto px-5 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{title}</h1>
      {intro && <p className="mt-3 text-muted-foreground">{intro}</p>}
      <div className="mt-8 space-y-8">{children}</div>
    </main>
  );
}

export function InfoSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <h2 className="text-lg font-bold text-foreground">{heading}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
