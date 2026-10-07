/** Exact integer KRW arithmetic. Never delegated to the AI. */
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const perPerson = (total: number, party: number) => Math.round(total / Math.max(1, party));
export const won = (n: number) => "₩" + Math.round(n).toLocaleString("en-US");
export function budgetState(limit: number | null, planned: number) {
  if (limit == null) return { limit, planned, remaining: null, over: 0 };
  return { limit, planned, remaining: Math.max(0, limit - planned), over: Math.max(0, planned - limit) };
}
