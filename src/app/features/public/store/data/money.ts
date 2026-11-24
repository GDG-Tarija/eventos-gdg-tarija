/**
 * Convierte un numeric(10,2) de Postgres (llega como number o string) a centavos enteros.
 * Math.round corrige el error binario de multiplicar (p. ej. 19.99 * 100 = 1998.9999…).
 */
export function toCents(value: number | string | null | undefined): number {
  const n = typeof value === 'string' ? Number(value) : value;
  if (n === null || n === undefined || !Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

const wholeFormat = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 0 });
const centsFormat = new Intl.NumberFormat('es-BO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "Bs 120" o "Bs 12,50": sin decimales cuando el monto es entero, como el resto del sitio. */
export function formatBs(cents: number): string {
  const format = cents % 100 === 0 ? wholeFormat : centsFormat;
  return `Bs ${format.format(cents / 100)}`;
}
