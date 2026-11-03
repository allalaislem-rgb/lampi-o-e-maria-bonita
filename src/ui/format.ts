/** Formatting helpers (amounts are integer cents of simulated credits) – pt-BR locale. */
export function money(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
