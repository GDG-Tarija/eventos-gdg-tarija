import { buildProfileData, RawProfileRegistration } from './profile.service';

const row = (id: string, start: string, over: Partial<RawProfileRegistration> = {}): RawProfileRegistration => ({
  id,
  status: 'CONFIRMED',
  events: { id: `e-${id}`, title: id, slug: id, location_name: null, date_start: start, date_end: start },
  ticket_types: { name: 'Gratis' },
  scan_logs: [],
  session_registrations: [],
  ...over,
});

const now = new Date('2026-06-10T12:00:00Z');

describe('buildProfileData', () => {
  const data = buildProfileData(
    [
      row('far', '2026-08-01T14:00:00Z'),
      row('old', '2026-01-01T14:00:00Z', { scan_logs: [{ id: 's' }] }),
      row('near', '2026-07-01T14:00:00Z', { status: 'PENDING' }),
      row('recent', '2026-05-01T14:00:00Z'),
    ],
    now,
  );

  it('separa próximos y pasados con el orden pedido', () => {
    expect(data.upcoming.map((i) => i.id)).toEqual(['near', 'far']);
    expect(data.past.map((i) => i.id)).toEqual(['recent', 'old']);
  });

  it('marca asistencia con al menos un escaneo y la cuenta', () => {
    expect(data.past.find((i) => i.id === 'old')?.attended).toBe(true);
    expect(data.past.find((i) => i.id === 'recent')?.attended).toBe(false);
    expect(data.attendedCount).toBe(1);
  });

  it('conserva el estado y usa valores por defecto', () => {
    expect(data.upcoming[0].status).toBe('PENDING');
    const [x] = buildProfileData([row('x', '2026-08-01T14:00:00Z', { ticket_types: null })], now).upcoming;
    expect(x.ticketName).toBe('Entrada General');
  });

  it('ordena y formatea las sesiones elegidas', () => {
    const [x] = buildProfileData(
      [
        row('s', '2026-08-01T14:00:00Z', {
          session_registrations: [
            { sessions: { title: 'B', start_time: '11:00:00', end_time: '12:30:00' } },
            { sessions: { title: 'A', start_time: '09:00:00', end_time: '10:30:00' } },
            { sessions: null },
          ],
        }),
      ],
      now,
    ).upcoming;
    expect(x.sessions).toEqual([
      { title: 'A', time: '09:00–10:30' },
      { title: 'B', time: '11:00–12:30' },
    ]);
  });
});
