/**
 * Convert explicit amount OR baseRate*unit into a final numeric amount.
 */
export function computeAmount(
  baseRate?: number,
  unit?: number,
  explicitAmount?: number
): number {
  // Prefer an explicitly provided amount if it's a valid number
  if (typeof explicitAmount === "number" && !isNaN(explicitAmount)) {
    return explicitAmount;
  }

  // Otherwise fall back to base-rate × units when both are valid numbers
  if (
    typeof baseRate === "number" &&
    typeof unit === "number" &&
    !isNaN(baseRate) &&
    !isNaN(unit)
  ) {
    return baseRate * unit;
  }
  
  return 0;
}

/**
 * Given a boolean or string flag for including transfer/wire charges, return
 * the numeric fee (currently €35) or 0.
 */
export function calculatePaymentCharges(
  flag?: string | boolean
): number {
  if (typeof flag === "boolean") return flag ? 35 : 0;
  if (typeof flag === "string") {
    return ["yes", "true", "1", "include", "included"].includes(
      flag.toLowerCase()
    )
      ? 35
      : 0;
  }
  return 0;
}
