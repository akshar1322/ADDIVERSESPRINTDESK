import { describe, expect, it } from "vitest";

import {
  calculateRemainingQuantity,
  normalizeMaterialUnit,
  normalizeMaterialUsageToGrams,
} from "./validation";

describe("workflow validation", () => {
  it("derives remaining quantity", () => {
    expect(calculateRemainingQuantity(10, 4)).toBe(6);
  });

  it("rejects overproduction by default", () => {
    expect(() => calculateRemainingQuantity(3, 4)).toThrow("Printed quantity cannot exceed required quantity.");
  });

  it("normalizes material units", () => {
    expect(normalizeMaterialUnit("grams")).toBe("GRAM");
    expect(normalizeMaterialUnit("kg")).toBe("KILOGRAM");
    expect(normalizeMaterialUnit("unknown")).toBe("OTHER");
  });

  it("converts known material mass units to grams", () => {
    expect(normalizeMaterialUsageToGrams(2, "kg")).toBe(2000);
    expect(normalizeMaterialUsageToGrams(250, "g")).toBe(250);
    expect(normalizeMaterialUsageToGrams(2, "pieces")).toBeNull();
  });
});
