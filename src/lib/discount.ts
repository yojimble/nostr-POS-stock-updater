export const ROUND_STEP_SATS = 500;

/** Percent off the subtotal, then optionally down to a multiple of ROUND_STEP_SATS (never below one step). */
export function applyDiscount(subtotal: number, percent: number, roundDown: boolean): number {
  const pct = Math.min(100, Math.max(0, Number.isFinite(percent) ? percent : 0));
  let total = Math.floor(subtotal * (1 - pct / 100));
  if (roundDown && total >= ROUND_STEP_SATS) {
    total = Math.floor(total / ROUND_STEP_SATS) * ROUND_STEP_SATS;
  }
  return total;
}
