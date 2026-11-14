import { TicketType } from '../../../../../models/ticket.model';

const formatBs = (n: number): string => `Bs ${Number.isInteger(n) ? n : n.toFixed(2)}`;

/** Resumen de precio para mostrar antes del login; `null` si el evento no tiene entradas. */
export function priceSummary(
  tickets: readonly TicketType[],
): { label: string; soldOut: boolean } | null {
  if (tickets.length === 0) return null;
  const available = tickets.filter((t) => !t.sold_out);
  if (available.length === 0) return { label: 'Entradas agotadas', soldOut: true };

  const prices = [...new Set(available.map((t) => t.price))].sort((a, b) => a - b);
  if (prices[0] === 0) {
    const paid = prices.find((p) => p > 0);
    return { label: paid === undefined ? 'Gratis' : `Gratis o desde ${formatBs(paid)}`, soldOut: false };
  }
  return {
    label: prices.length === 1 ? formatBs(prices[0]) : `Desde ${formatBs(prices[0])}`,
    soldOut: false,
  };
}
