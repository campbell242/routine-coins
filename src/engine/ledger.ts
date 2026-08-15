// Coin ledger — balance only (no transaction history, per spec).
// All balance mutations flow through these functions.

export class LedgerError extends Error {}

export function award(balance: number, amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) throw new LedgerError('award: invalid amount');
  return balance + Math.round(amount);
}

/** Manual parent adjustment; balance never goes below zero. */
export function adjust(balance: number, delta: number): number {
  if (!Number.isFinite(delta)) throw new LedgerError('adjust: invalid delta');
  return Math.max(0, balance + Math.round(delta));
}

/**
 * Redeem coins for a real-world reward. Custom amounts allowed; the remainder
 * stays on the balance; redemption may never exceed the balance.
 */
export function redeem(balance: number, amount: number): number {
  const amt = Math.round(amount);
  if (!Number.isFinite(amount) || amt <= 0) throw new LedgerError('redeem: invalid amount');
  if (amt > balance) throw new LedgerError('redeem: amount exceeds balance');
  return balance - amt;
}
