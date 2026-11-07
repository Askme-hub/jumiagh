import { describe, it, expect } from "vitest";
import { code128Bars } from "./barcode128";

describe("code128", () => {
  it("encodes start B, data, checksum and stop", () => {
    // start(6) + 2 chars(12) + check(6) + stop(7)
    expect(code128Bars("AB").length).toBe(31);
  });
  it("every symbol is 11 modules wide", () => {
    const bars = code128Bars("JM2611");
    const total = bars.reduce((a, b) => a + b, 0);
    expect(total).toBe(11 * 9 + 2); // start + 6 chars + check + stop, stop has 2 extra modules
  });
});
