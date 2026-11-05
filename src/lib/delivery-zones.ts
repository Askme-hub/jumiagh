// Ghana door-delivery zones. Shared by checkout (display) and the server (charging).
export type DeliveryZone = { id: string; label: string; fee: number; eta: string; regions: string[] };

export const DELIVERY_ZONES: DeliveryZone[] = [
  { id: "accra", label: "Greater Accra", fee: 25, eta: "1–2 days", regions: ["Greater Accra"] },
  { id: "south", label: "Kumasi & southern belt", fee: 35, eta: "2–3 days", regions: ["Ashanti", "Central", "Eastern"] },
  { id: "regional", label: "Other regional capitals", fee: 45, eta: "3–4 days", regions: ["Western", "Volta", "Bono", "Northern"] },
  { id: "remote", label: "Rest of Ghana", fee: 55, eta: "4–5 days", regions: [] },
];

export function zoneForRegion(region: string | null | undefined): DeliveryZone {
  return DELIVERY_ZONES.find((z) => z.regions.includes(region ?? "")) ?? DELIVERY_ZONES[DELIVERY_ZONES.length - 1];
}

/** Each seller ships separately: charge the zone rate, or the seller's own rate if higher. */
export function doorDeliveryFee(region: string | null | undefined, sellerFees: number[]): number {
  const zone = zoneForRegion(region);
  if (sellerFees.length === 0) return zone.fee;
  return sellerFees.reduce((a, f) => a + Math.max(Number(f) || 0, zone.fee), 0);
}
