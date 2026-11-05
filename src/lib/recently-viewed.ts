const KEY = "kivora-recently-viewed";

export function getRecentlyViewed(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
export function trackViewed(id: string) {
  try {
    const list = [id, ...getRecentlyViewed().filter((x) => x !== id)].slice(0, 30);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}
export function clearRecentlyViewed() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
