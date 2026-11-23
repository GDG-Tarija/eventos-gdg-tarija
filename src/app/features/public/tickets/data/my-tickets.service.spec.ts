import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SUPABASE } from '../../../../core/supabase/supabase.client';
import { buildMyTickets, MyTicketsService, TicketRegistrationRow } from './my-tickets.service';

const row = (id: string, start: string, over: Partial<TicketRegistrationRow> = {}): TicketRegistrationRow => ({
  id,
  status: 'CONFIRMED',
  events: { id: `e-${id}`, title: id, slug: id, location_name: null, date_start: start, date_end: start },
  ticket_types: { name: 'Gratis' },
  scan_logs: [],
  session_registrations: [],
  ...over,
});

const now = new Date('2026-06-10T12:00:00Z');

describe('buildMyTickets', () => {
  const data = buildMyTickets(
    [
      row('far', '2026-08-01T14:00:00Z'),
      row('old', '2026-01-01T14:00:00Z', { scan_logs: [{ id: 's' }] }),
      row('near', '2026-07-01T14:00:00Z', { status: 'PENDING' }),
      row('recent', '2026-05-01T14:00:00Z'),
    ],
    now,
  );

  it('marca el sorteo solo si el evento tiene actividades', () => {
    const base = row('r', '2026-08-01T14:00:00Z').events!;
    const [withRaffle] = buildMyTickets(
      [row('r', '2026-08-01T14:00:00Z', { events: { ...base, point_activities: [{ count: 3 }] } })],
      now,
    ).upcoming;
    expect(withRaffle.hasRaffle).toBe(true);
    expect(data.upcoming[0].hasRaffle).toBe(false);
  });

  it('separa próximos y pasados con el orden pedido', () => {
    expect(data.upcoming.map((i) => i.id)).toEqual(['near', 'far']);
    expect(data.past.map((i) => i.id)).toEqual(['recent', 'old']);
  });

  it('marca asistencia con al menos un escaneo y la cuenta', () => {
    expect(data.past.find((i) => i.id === 'old')?.attended).toBe(true);
    expect(data.past.find((i) => i.id === 'recent')?.attended).toBe(false);
    expect(data.attendedCount).toBe(1);
  });

  it('conserva en próximos un evento en curso que ya acredita asistencia', () => {
    const ongoing = row('en-curso', '2026-06-10T10:00:00Z', { scan_logs: [{ id: 'scan' }] });
    const event = { ...ongoing.events!, date_end: '2026-06-10T17:00:00Z' };
    const result = buildMyTickets([{ ...ongoing, events: event }], now);

    expect(result.upcoming[0]).toMatchObject({ id: 'en-curso', attended: true });
    expect(result.past).toEqual([]);
  });

  it('conserva el estado y usa valores por defecto', () => {
    expect(data.upcoming[0].status).toBe('PENDING');
    const [x] = buildMyTickets([row('x', '2026-08-01T14:00:00Z', { ticket_types: null })], now).upcoming;
    expect(x.ticketName).toBe('Entrada General');
  });

  it('ordena las sesiones por día y luego por hora, dejando al final las que esperan fecha', () => {
    const [x] = buildMyTickets(
      [
        row('s', '2026-08-01T14:00:00Z', {
          session_registrations: [
            { sessions: { id: 's2', title: 'B', date: '2026-08-01', start_time: '11:00:00', end_time: '12:30:00' } },
            { sessions: { id: 's3', title: 'C', date: '2026-08-02', start_time: '08:00:00', end_time: null } },
            { sessions: { id: 's4', title: 'D', date: null, start_time: '07:00:00', end_time: null } },
            { sessions: { id: 's1', title: 'A', date: '2026-08-01', start_time: '09:00:00', end_time: '10:30:00' } },
            { sessions: null },
          ],
        }),
      ],
      now,
    ).upcoming;
    expect(x.sessions).toEqual([
      { id: 's1', title: 'A', dateLabel: '1 de agosto', time: '09:00–10:30' },
      { id: 's2', title: 'B', dateLabel: '1 de agosto', time: '11:00–12:30' },
      { id: 's3', title: 'C', dateLabel: '2 de agosto', time: '08:00' },
      { id: 's4', title: 'D', dateLabel: 'Fecha por confirmar', time: '07:00' },
    ]);
  });

  it('mantiene las sesiones con horario parcial o sin definir', () => {
    const [registration] = buildMyTickets([
      row('r', '2026-08-01T14:00:00Z', {
        session_registrations: [
          { sessions: { id: 's1', title: 'Taller', date: null, start_time: null, end_time: null } },
          { sessions: { id: 's2', title: 'Taller', date: null, start_time: '09:30:00', end_time: null } },
          { sessions: { id: 's3', title: 'Preguntas', date: null, start_time: null, end_time: '12:15:00' } },
        ],
      }),
    ], now).upcoming;

    expect(registration.sessions).toEqual([
      { id: 's2', title: 'Taller', dateLabel: 'Fecha por confirmar', time: '09:30' },
      { id: 's1', title: 'Taller', dateLabel: 'Fecha por confirmar', time: 'Horario por confirmar' },
      { id: 's3', title: 'Preguntas', dateLabel: 'Fecha por confirmar', time: 'Hasta 12:15' },
    ]);
  });
});

describe('MyTicketsService.loadMine', () => {
  it('consulta las inscripciones del usuario y las relaciones de su ticket y certificado', async () => {
    const eq = vi.fn().mockResolvedValue({
      data: [row('my-registration', '2020-01-01T15:00:00Z', { scan_logs: [{ id: 'checkin' }] })],
      error: null,
    });
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    TestBed.configureTestingModule({ providers: [{ provide: SUPABASE, useValue: { from } }] });

    const data = await TestBed.inject(MyTicketsService).loadMine('current-user');

    expect(from).toHaveBeenCalledWith('registrations');
    expect(eq).toHaveBeenCalledWith('user_id', 'current-user');
    expect(select).toHaveBeenCalledWith(expect.stringContaining('scan_logs'));
    expect(select).toHaveBeenCalledWith(expect.stringContaining('session_registrations'));
    expect(select).toHaveBeenCalledWith(expect.stringContaining('events ('));
    expect(data.past[0]).toMatchObject({ id: 'my-registration', attended: true, status: 'CONFIRMED' });
  });
});
