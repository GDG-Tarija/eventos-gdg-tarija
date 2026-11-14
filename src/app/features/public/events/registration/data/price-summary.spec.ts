import { describe, expect, it } from 'vitest';
import { TicketType } from '../../../../../models/ticket.model';
import { priceSummary } from './price-summary';

const t = (price: number, sold_out = false) => ({ price, sold_out }) as TicketType;

describe('priceSummary', () => {
  it('devuelve null sin entradas', () => {
    expect(priceSummary([])).toBeNull();
  });

  it('marca agotado cuando todas están agotadas', () => {
    expect(priceSummary([t(30, true), t(0, true)])).toEqual({
      label: 'Entradas agotadas',
      soldOut: true,
    });
  });

  it('muestra Gratis si todas las disponibles son gratis', () => {
    expect(priceSummary([t(0), t(0)])).toEqual({ label: 'Gratis', soldOut: false });
  });

  it('mezcla gratis y de pago: usa el menor precio de pago', () => {
    expect(priceSummary([t(0), t(50), t(30), t(20, true)])).toEqual({
      label: 'Gratis o desde Bs 30',
      soldOut: false,
    });
  });

  it('muestra un precio único', () => {
    expect(priceSummary([t(30), t(30)])).toEqual({ label: 'Bs 30', soldOut: false });
  });

  it('muestra "Desde" con varios precios', () => {
    expect(priceSummary([t(50), t(30)])).toEqual({ label: 'Desde Bs 30', soldOut: false });
  });

  it('ignora entradas agotadas al calcular el mínimo', () => {
    expect(priceSummary([t(0, true), t(30)])).toEqual({ label: 'Bs 30', soldOut: false });
  });

  it('usa 2 decimales si el precio no es entero', () => {
    expect(priceSummary([t(25.5)])).toEqual({ label: 'Bs 25.50', soldOut: false });
  });
});
