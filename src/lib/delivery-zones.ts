// Ghana door-delivery zones. Admins edit live prices in the database; these are fallbacks.
export type DeliveryZone = { id: string; label: string; fee: number; eta: string; regions: string[] };

export const DELIVERY_ZONES: DeliveryZone[] = [
  "Greater Accra", "Ashanti", "Central", "Eastern", "Western", "Western North",
  "Volta", "Oti", "Bono", "Bono East", "Ahafo", "Northern", "North East",
  "Savannah", "Upper East", "Upper West",
].map((region) => {
  const southern = ["Ashanti", "Central", "Eastern"].includes(region);
  const regional = ["Western", "Volta", "Bono", "Northern"].includes(region);
  return {
    id: `region-${region.toLowerCase().replaceAll(" ", "-")}`,
    label: region,
    fee: region === "Greater Accra" ? 25 : southern ? 35 : regional ? 45 : 55,
    eta: region === "Greater Accra" ? "1–2 days" : southern ? "2–3 days" : regional ? "3–4 days" : "4–5 days",
    regions: [region],
  };
});

export function normalizeZones(rows: any[] | null | undefined): DeliveryZone[] {
  if (!rows || rows.length === 0) return DELIVERY_ZONES;
  return rows.map((r) => ({ id: r.id, label: r.label, fee: Number(r.fee) || 0, eta: r.eta ?? "", regions: r.regions ?? [] }));
}

export function zoneForRegion(region: string | null | undefined, zones: DeliveryZone[] = DELIVERY_ZONES): DeliveryZone {
  return zones.find((z) => z.regions.includes(region ?? "")) ?? zones.find((z) => z.regions.length === 0) ?? DELIVERY_ZONES.find((z) => z.regions.includes(region ?? "")) ?? DELIVERY_ZONES[DELIVERY_ZONES.length - 1];
}

/** Each seller ships separately: charge the zone rate, or the seller's own rate if higher. */
export function doorDeliveryFee(region: string | null | undefined, sellerFees: number[], zones: DeliveryZone[] = DELIVERY_ZONES): number {
  const zone = zoneForRegion(region, zones);
  if (sellerFees.length === 0) return zone.fee;
  return sellerFees.reduce((a, f) => a + Math.max(Number(f) || 0, zone.fee), 0);
}
