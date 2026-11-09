import { TicketType } from '../../../../../models/ticket.model';
import {
  AvailabilityRow,
  buildTicketTypes,
  getActivePhase,
  getSoldOutPhases,
  lowStockRemaining,
  TicketTypeRow,
} from './ticket-availability';

const type = (id: string, over: Partial<TicketTypeRow> = {}): TicketTypeRow => ({
  id,
  event_id: 'e1',
  name: `Pase ${id}`,
  price: 50,
  ticket_capacity: null,
  payment_qr_url: 'qr-pkg',
  image_url: null,
  ...over,
});

const row = (over: Partial<AvailabilityRow>): AvailabilityRow => ({
  ticket_type_id: 't1',
  ticket_phase_id: 'p1',
  name: 'Preventa',
  position: 1,
  price: 30,
  payment_qr_url: 'qr-pre',
  capacity: 50,
  sold: 10,
  remaining: 40,
  is_active: true,
  package_capacity: null,
  package_sold: 10,
  ...over,
});

describe('buildTicketTypes', () => {
  it('paquete sin fases conserva precio, QR y cupo del paquete', () => {
    const [t] = buildTicketTypes(
      [type('t1', { ticket_capacity: 100 })],
      [row({ ticket_phase_id: null, price: 50, payment_qr_url: 'qr-pkg', capacity: 100, remaining: 90, package_capacity: 100, package_sold: 10 })],
    );
    expect(t.phases).toBeUndefined();
    expect(t.active_phase).toBeUndefined();
    expect(t.price).toBe(50);
    expect(t.payment_qr_url).toBe('qr-pkg');
    expect(t.sold_out).toBe(false);
    expect(t.remaining).toBe(90);
  });

  it('paquete sin fases se agota al llegar a ticket_capacity', () => {
    const [t] = buildTicketTypes(
      [type('t1', { ticket_capacity: 20 })],
      [row({ ticket_phase_id: null, capacity: 20, remaining: 0, package_capacity: 20, package_sold: 20 })],
    );
    expect(t.sold_out).toBe(true);
    expect(t.remaining).toBe(0);
  });

  it('sin fila de disponibilidad usa las columnas del paquete y no se agota', () => {
    const [t] = buildTicketTypes([type('t1', { price: '25' })], []);
    expect(t.price).toBe(25);
    expect(t.sold_out).toBe(false);
    expect(t.remaining).toBeNull();
  });

  it('con fases muestra precio y QR de la fase activa', () => {
    const [t] = buildTicketTypes(
      [type('t1')],
      [
        row({ ticket_phase_id: 'p2', name: 'Normal', position: 2, price: 50, payment_qr_url: 'qr-normal', capacity: null, sold: 0, remaining: null, is_active: false }),
        row({}),
      ],
    );
    expect(t.phases?.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(t.active_phase?.id).toBe('p1');
    expect(t.price).toBe(30);
    expect(t.payment_qr_url).toBe('qr-pre');
    expect(t.remaining).toBe(40);
  });

  it('al agotar la preventa pasa a la siguiente fase y la tacha', () => {
    const [t] = buildTicketTypes(
      [type('t1')],
      [
        row({ sold: 50, remaining: 0, is_active: false }),
        row({ ticket_phase_id: 'p2', name: 'Normal', position: 2, price: 50, payment_qr_url: 'qr-normal', capacity: null, sold: 0, remaining: null, is_active: true }),
      ],
    );
    expect(t.active_phase?.id).toBe('p2');
    expect(t.price).toBe(50);
    expect(t.payment_qr_url).toBe('qr-normal');
    expect(t.sold_out).toBe(false);
    expect(getSoldOutPhases(t).map((p) => p.id)).toEqual(['p1']);
    expect(t.remaining).toBeNull();
  });

  it('todas las fases llenas: paquete agotado', () => {
    const [t] = buildTicketTypes(
      [type('t1')],
      [
        row({ sold: 50, remaining: 0, is_active: false }),
        row({ ticket_phase_id: 'p2', position: 2, price: 50, capacity: 10, sold: 10, remaining: 0, is_active: false }),
      ],
    );
    expect(t.sold_out).toBe(true);
    expect(t.active_phase).toBeNull();
    expect(t.remaining).toBe(0);
  });

  it('cupo total del paquete agotado deja el paquete deshabilitado aunque la fase tenga lugar', () => {
    const [t] = buildTicketTypes(
      [type('t1', { ticket_capacity: 10 })],
      [row({ capacity: 50, sold: 10, remaining: 40, is_active: false, package_capacity: 10, package_sold: 10 })],
    );
    expect(t.sold_out).toBe(true);
  });

  it('remaining es el menor entre la fase activa y el cupo del paquete', () => {
    const [t] = buildTicketTypes(
      [type('t1', { ticket_capacity: 15 })],
      [row({ capacity: 50, sold: 10, remaining: 40, package_capacity: 15, package_sold: 12 })],
    );
    expect(t.remaining).toBe(3);
  });

  it('ordena los paquetes por precio vigente', () => {
    const res = buildTicketTypes(
      [type('a', { price: 100 }), type('b', { price: 5 })],
      [
        row({ ticket_type_id: 'a', ticket_phase_id: null, price: 100 }),
        row({ ticket_type_id: 'b', ticket_phase_id: null, price: 5 }),
      ],
    );
    expect(res.map((t) => t.id)).toEqual(['b', 'a']);
  });
});

describe('getActivePhase / lowStockRemaining', () => {
  it('getActivePhase devuelve null sin fases o sin activa', () => {
    expect(getActivePhase(undefined)).toBeNull();
    expect(getActivePhase([])).toBeNull();
  });

  const base = { id: 't', event_id: 'e', name: 'n', price: 1, ticket_capacity: 0 } as TicketType;

  it('avisa solo con 1..10 lugares', () => {
    expect(lowStockRemaining({ ...base, remaining: 10 })).toBe(10);
    expect(lowStockRemaining({ ...base, remaining: 1 })).toBe(1);
    expect(lowStockRemaining({ ...base, remaining: 11 })).toBeNull();
    expect(lowStockRemaining({ ...base, remaining: 0 })).toBeNull();
    expect(lowStockRemaining({ ...base, remaining: null })).toBeNull();
    expect(lowStockRemaining({ ...base, remaining: 3, sold_out: true })).toBeNull();
  });
});
