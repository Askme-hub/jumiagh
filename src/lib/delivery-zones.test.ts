import { describe, it, expect } from "vitest";
import { DELIVERY_ZONES, doorDeliveryFee, zoneForRegion } from "./delivery-zones";

describe("individual region delivery fees", () => {
  it("provides one independently priced setting for every Ghana region", () => {
    expect(DELIVERY_ZONES).toHaveLength(16);
    expect(new Set(DELIVERY_ZONES.flatMap((z) => z.regions)).size).toBe(16);
    expect(DELIVERY_ZONES.every((z) => z.regions.length === 1)).toBe(true);
  });
  it("changing Ashanti does not change Central or Eastern checkout fees", () => {
    const zones = DELIVERY_ZONES.map((z) => z.label === "Ashanti" ? { ...z, fee: 70 } : z);
    expect(doorDeliveryFee("Ashanti", [0], zones)).toBe(70);
    expect(doorDeliveryFee("Central", [0], zones)).toBe(35);
    expect(doorDeliveryFee("Eastern", [0], zones)).toBe(35);
  });
  it("keeps the higher seller fee for each separately shipped order", () => {
    expect(doorDeliveryFee("Greater Accra", [10, 40])).toBe(65);
  });
  it("uses the matching region fallback if live settings are incomplete", () => {
    expect(zoneForRegion("Greater Accra", []).fee).toBe(25);
  });
});