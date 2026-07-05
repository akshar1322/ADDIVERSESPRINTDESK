export const materialUnitAliases = {
  g: "GRAM",
  gram: "GRAM",
  grams: "GRAM",
  kg: "KILOGRAM",
  kilogram: "KILOGRAM",
  kilograms: "KILOGRAM",
  m: "METER",
  meter: "METER",
  meters: "METER",
  mm: "MILLIMETER",
  millimeter: "MILLIMETER",
  millimeters: "MILLIMETER",
  pc: "PIECE",
  pcs: "PIECE",
  piece: "PIECE",
  pieces: "PIECE",
} as const;

export type NormalizedMaterialUnit =
  | "GRAM"
  | "KILOGRAM"
  | "METER"
  | "MILLIMETER"
  | "PIECE"
  | "OTHER";

export function calculateRemainingQuantity(requiredQuantity: number, printedQuantity: number) {
  assertNonNegativeInteger(requiredQuantity, "Required quantity");
  assertNonNegativeInteger(printedQuantity, "Printed quantity");

  if (printedQuantity > requiredQuantity) {
    throw new Error("Printed quantity cannot exceed required quantity.");
  }

  return requiredQuantity - printedQuantity;
}

export function assertNonNegativeInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative whole number.`);
  }
}

export function assertNonNegativeNumber(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }
}

export function normalizeMaterialUnit(unit: string): NormalizedMaterialUnit {
  const normalized = unit.trim().toLowerCase();

  if (!normalized) {
    return "OTHER";
  }

  return materialUnitAliases[normalized as keyof typeof materialUnitAliases] ?? "OTHER";
}

export function normalizeMaterialUsageToGrams(amount: number, unit: string) {
  assertNonNegativeNumber(amount, "Material usage");

  const normalizedUnit = normalizeMaterialUnit(unit);

  if (normalizedUnit === "GRAM") {
    return amount;
  }

  if (normalizedUnit === "KILOGRAM") {
    return amount * 1000;
  }

  return null;
}
