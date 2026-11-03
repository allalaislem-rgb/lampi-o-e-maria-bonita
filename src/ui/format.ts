/** Formatting helpers (amounts are integer cents of simulated FUN credits). */
export function money(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
