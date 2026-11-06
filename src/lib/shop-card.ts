// Browser-only: draws a shop business card or social flyer onto a canvas and returns a PNG blob.
import QRCode from "qrcode";

export type CardTheme = "orange" | "slate" | "white";
export type CardFormat = "card" | "flyer";

export type CardShop = {
  shop_name: string;
  slug: string;
  logo_url?: string | null;
  location?: string | null;
  whatsapp_number?: string | null;
  phone?: string | null;
  business_category?: string | null;
  verified?: boolean;
  bio?: string | null;
};

export const SHOP_BASE_URL = "https://kivoragh.shop";

// Canvas drawing needs literal colours (no CSS variables); these mirror the brand palette.
export const CARD_THEMES: Record<CardTheme, { label: string; bg: string; bg2: string; fg: string; sub: string; accent: string; qrDark: string; qrLight: string }> = {
  orange: { label: "Kivora Orange", bg: "#F97316", bg2: "#EA580C", fg: "#FFFFFF", sub: "#FFEDD5", accent: "#18181B", qrDark: "#18181B", qrLight: "#FFFFFF" },
  slate: { label: "Dark Slate", bg: "#18181B", bg2: "#27272A", fg: "#FFFFFF", sub: "#A1A1AA", accent: "#F97316", qrDark: "#18181B", qrLight: "#FFFFFF" },
  white: { label: "Clean White", bg: "#FFFFFF", bg2: "#FFF7ED", fg: "#18181B", sub: "#52525B", accent: "#F97316", qrDark: "#18181B", qrLight: "#FFFFFF" },
};

export const shopUrl = (slug: string) => `${SHOP_BASE_URL}/shop/${slug}`;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number, size: number, weight = 800) {
  let s = size;
  do {
    ctx.font = `${weight} ${s}px Outfit, Figtree, sans-serif`;
    if (ctx.measureText(text).width <= maxW) break;
    s -= 2;
  } while (s > 14);
  return s;
}

async function drawLogo(ctx: CanvasRenderingContext2D, shop: CardShop, x: number, y: number, size: number, t: (typeof CARD_THEMES)[CardTheme]) {
  ctx.save();
  roundRect(ctx, x, y, size, size, size * 0.22);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.clip();
  const img = shop.logo_url ? await loadImage(shop.logo_url) : null;
  if (img) {
    ctx.drawImage(img, x, y, size, size);
  } else {
    ctx.fillStyle = t.accent === "#18181B" ? "#F97316" : t.accent;
    ctx.font = `800 ${size * 0.5}px Outfit, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(shop.shop_name.charAt(0).toUpperCase(), x + size / 2, y + size / 2);
  }
  ctx.restore();
}

async function drawQr(ctx: CanvasRenderingContext2D, url: string, x: number, y: number, size: number, t: (typeof CARD_THEMES)[CardTheme]) {
  const qr = await QRCode.toDataURL(url, { margin: 1, width: size * 2, errorCorrectionLevel: "H", color: { dark: t.qrDark, light: t.qrLight } });
  const img = await loadImage(qr);
  ctx.save();
  roundRect(ctx, x - 12, y - 12, size + 24, size + 24, 24);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  if (img) ctx.drawImage(img, x, y, size, size);
  ctx.restore();
}

function verified(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save();
  ctx.font = `700 ${22 * scale}px Figtree, sans-serif`;
  const label = "✓ Kivora Verified";
  const w = ctx.measureText(label).width + 28 * scale;
  roundRect(ctx, x, y, w, 38 * scale, 19 * scale);
  ctx.fillStyle = "#16A34A";
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(label, x + 14 * scale, y + 19 * scale);
  ctx.restore();
}

export async function renderShopCard(shop: CardShop, format: CardFormat, theme: CardTheme): Promise<HTMLCanvasElement> {
  if (document.fonts?.ready) await document.fonts.ready;
  const t = CARD_THEMES[theme];
  const url = shopUrl(shop.slug);
  const contact = shop.whatsapp_number || shop.phone || "";
  const canvas = document.createElement("canvas");
  const W = format === "card" ? 1050 : 1080;
  const H = format === "card" ? 600 : 1920;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, t.bg);
  g.addColorStop(1, t.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // decorative circle
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = t.fg;
  ctx.beginPath();
  ctx.arc(W * 0.95, H * 0.05, W * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  if (format === "card") {
    await drawLogo(ctx, shop, 60, 60, 120, t);
    const nameSize = fitText(ctx, shop.shop_name, 560, 56);
    ctx.fillStyle = t.fg;
    ctx.fillText(shop.shop_name, 60, 245 + (56 - nameSize) / 2);
    let y = 290;
    if (shop.business_category) {
      ctx.font = "700 24px Figtree, sans-serif";
      ctx.fillStyle = t.sub;
      ctx.fillText(shop.business_category.toUpperCase(), 60, y);
      y += 20;
    }
    if (shop.verified) { verified(ctx, 60, y, 1); y += 50; }
    ctx.font = "600 26px Figtree, sans-serif";
    ctx.fillStyle = t.fg;
    y += 40;
    if (shop.location) { ctx.fillText(`📍 ${shop.location}`, 60, y); y += 42; }
    if (contact) { ctx.fillText(`📞 ${contact}`, 60, y); y += 42; }
    await drawQr(ctx, url, 740, 120, 250, t);
    ctx.font = "700 20px Figtree, sans-serif";
    ctx.fillStyle = t.fg;
    ctx.textAlign = "center";
    ctx.fillText("Scan to shop", 865, 420);
    ctx.textAlign = "left";
    ctx.font = "600 20px Figtree, sans-serif";
    ctx.fillStyle = t.sub;
    ctx.fillText(url.replace("https://", ""), 60, H - 50);
    ctx.textAlign = "right";
    ctx.font = "800 22px Outfit, sans-serif";
    ctx.fillStyle = t.fg;
    ctx.fillText("KIVORA GH", W - 60, H - 50);
  } else {
    ctx.textAlign = "center";
    ctx.font = "800 40px Outfit, sans-serif";
    ctx.fillStyle = t.fg;
    ctx.fillText("KIVORA GH", W / 2, 130);
    await drawLogo(ctx, shop, W / 2 - 130, 220, 260, t);
    ctx.textAlign = "center";
    const nameSize = fitText(ctx, shop.shop_name, W - 140, 92);
    ctx.fillStyle = t.fg;
    ctx.fillText(shop.shop_name, W / 2, 600 + (92 - nameSize) / 3);
    let y = 660;
    if (shop.business_category) {
      ctx.font = "700 34px Figtree, sans-serif";
      ctx.fillStyle = t.sub;
      ctx.fillText(shop.business_category.toUpperCase(), W / 2, y);
      y += 30;
    }
    if (shop.verified) {
      ctx.font = "700 33px Figtree, sans-serif";
      const w = ctx.measureText("✓ Kivora Verified").width + 42;
      verified(ctx, W / 2 - w / 2, y, 1.5);
      ctx.textAlign = "center";
      y += 70;
    }
    ctx.font = "600 38px Figtree, sans-serif";
    ctx.fillStyle = t.fg;
    y += 60;
    if (shop.location) { ctx.fillText(`📍 ${shop.location}`, W / 2, y); y += 60; }
    if (contact) { ctx.fillText(`📞 ${contact}`, W / 2, y); y += 60; }
    await drawQr(ctx, url, W / 2 - 250, 1130, 500, t);
    ctx.textAlign = "center";
    ctx.font = "800 46px Outfit, sans-serif";
    ctx.fillStyle = t.fg;
    ctx.fillText("Scan to visit our shop", W / 2, 1745);
    ctx.font = "600 32px Figtree, sans-serif";
    ctx.fillStyle = t.sub;
    ctx.fillText(url.replace("https://", ""), W / 2, 1810);
  }
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create image"))), "image/png"));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
