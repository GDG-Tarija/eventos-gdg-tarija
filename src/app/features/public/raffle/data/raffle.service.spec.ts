import { PoolRow, ScanResult, buildPool, extractRegistrationId, scanMessage } from './raffle.service';

const ID = '5a770000-0000-4000-8000-0000000001b1';

describe('extractRegistrationId', () => {
  it('acepta el UUID solo o dentro de un link', () => {
    expect(extractRegistrationId(ID)).toBe(ID);
    expect(extractRegistrationId(`https://eventos.gdgtarija.com/n/${ID.toUpperCase()}`)).toBe(ID);
  });

  it('rechaza lo que no es una entrada', () => {
    expect(extractRegistrationId('https://gdg.community.dev')).toBeNull();
  });
});

describe('scanMessage', () => {
  it('actividad: +1 para la persona escaneada', () => {
    expect(scanMessage({ status: 'ok', name: 'Ana' }, true)).toEqual({
      tone: 'ok',
      text: '+1 ticket para Ana',
    });
  });

  it('networking: dice a quién le sumó según el tope de cada uno', () => {
    const base = { status: 'ok' as const, name: 'Beto', my_net: 3, net_cap: 5 };
    expect(scanMessage({ ...base, mine_added: true, theirs_added: true }, false).text).toBe(
      '¡+1 ticket para ti y para Beto! Networking 3/5',
    );
    expect(scanMessage({ ...base, mine_added: true, theirs_added: false }, false).text).toContain(
      'Beto ya llegó',
    );
    expect(
      scanMessage({ ...base, my_net: 5, mine_added: false, theirs_added: true }, false).text,
    ).toBe('+1 ticket para Beto. Tú ya llegaste a tu tope de 5.');
  });

  it('el mismo estado se explica según el modo', () => {
    expect(scanMessage({ status: 'not_checked_in', name: 'Ana' }, true).text).toBe(
      'Ana todavía no hizo check-in en la entrada.',
    );
    expect(scanMessage({ status: 'not_checked_in', name: 'Ana' }, false).text).toContain('los dos');
    expect(scanMessage({ status: 'already', name: 'Ana' }, false).text).toBe(
      'Ya hicieron networking con Ana.',
    );
  });

  it('repetidos y errores no suenan a éxito', () => {
    expect(scanMessage({ status: 'already', name: 'Ana' }, true).tone).toBe('warn');
    expect(scanMessage({ status: 'self' }, false).tone).toBe('warn');
    expect(scanMessage({ status: 'forbidden' }, true).tone).toBe('error');
    expect(scanMessage({ status: 'invalid' }, false).tone).toBe('error');
  });

  it('a quien no participa del sorteo no le habla de sus tickets', () => {
    const ok = { status: 'ok' as const, name: 'Ana', my_net: 1, net_cap: 5, mine_added: true };
    expect(scanMessage({ ...ok, theirs_added: true }, false, false).text).toBe(
      '+1 ticket de networking para Ana',
    );
    expect(scanMessage({ ...ok, theirs_added: false }, false, false).tone).toBe('warn');
  });

  it('sin nombre o con un estado desconocido igual muestra un mensaje', () => {
    expect(scanMessage({ status: 'ok', name: null }, true).text).toBe(
      '+1 ticket para esta persona',
    );
    expect(scanMessage({ status: 'nuevo' } as unknown as ScanResult, true).tone).toBe('error');
  });
});

describe('buildPool', () => {
  const row = (id: string, scans: string[], over: Partial<PoolRow> = {}): PoolRow => ({
    id,
    status: 'CONFIRMED',
    event_role: 'ATTENDEE',
    user_id: `u-${id}`,
    users: { first_name: id, last_name: '', avatar_url: id === 'ana' ? 'https://foto/ana' : null },
    scan_logs: scans.map((scan_type) => ({ scan_type })),
    ...over,
  });

  it('cuenta check-in, actividades existentes y networking del evento', () => {
    const pool = buildPool(
      [
        row('ana', ['checkin', 'pts:a1', 'pts:borrada', 'net:beto', 'net:otro-evento', 'refrigerio']),
        row('beto', ['checkin', 'net:ana']),
      ],
      ['a1'],
      [],
    );
    expect(pool).toEqual([
      { registrationId: 'ana', name: 'ana', tickets: 3, avatarUrl: 'https://foto/ana' },
      { registrationId: 'beto', name: 'beto', tickets: 2, avatarUrl: null },
    ]);
  });

  it('deja fuera a quien no cumple las reglas del sorteo', () => {
    const pool = buildPool(
      [
        row('sin-checkin', ['pts:a1']),
        row('sponsor', ['checkin'], { event_role: 'SPONSOR' }),
        row('pendiente', ['checkin'], { status: 'PENDING' }),
        row('sin-cuenta', ['checkin'], { user_id: null }),
        row('ya-gano', ['checkin']),
        row('ok', ['checkin']),
      ],
      ['a1'],
      ['ya-gano'],
    );
    expect(pool.map((p) => p.registrationId)).toEqual(['ok']);
  });
});
