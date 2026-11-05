// Ghana door-delivery zones. Admins edit live prices in the database; these are fallbacks.
export type DeliveryZone = { id: string; label: string; fee: number; eta: string; regions: string[] };

export const DELIVERY_ZONES: DeliveryZone[] = [
  { id: "accra", label: "Greater Accra", fee: 25, eta: "1–2 days", regions: ["Greater Accra"] },
  { id: "south", label: "Kumasi & southern belt", fee: 35, eta: "2–3 days", regions: ["Ashanti", "Central", "Eastern"] },
  { id: "regional", label: "Other regional capitals", fee: 45, eta: "3–4 days", regions: ["Western", "Volta", "Bono", "Northern"] },
  { id: "remote", label: "Rest of Ghana", fee: 55, eta: "4–5 days", regions: [] },
];

export function normalizeZones(rows: any[] | null | undefined): DeliveryZone[] {
  if (!rows || rows.length === 0) return DELIVERY_ZONES;
  return rows.map((r) => ({ id: r.id, label: r.label, fee: Number(r.fee) || 0, eta: r.eta ?? "", regions: r.regions ?? [] }));
}

export function zoneForRegion(region: string | null | undefined, zones: DeliveryZone[] = DELIVERY_ZONES): DeliveryZone {
  return zones.find((z) => z.regions.includes(region ?? "")) ?? zones.find((z) => z.regions.length === 0) ?? zones[zones.length - 1];
}

/** Each seller ships separately: charge the zone rate, or the seller's own rate if higher. */
export function doorDeliveryFee(region: string | null | undefined, sellerFees: number[], zones: DeliveryZone[] = DELIVERY_ZONES): number {
  const zone = zoneForRegion(region, zones);
  if (sellerFees.length === 0) return zone.fee;
  return sellerFees.reduce((a, f) => a + Math.max(Number(f) || 0, zone.fee), 0);
}
