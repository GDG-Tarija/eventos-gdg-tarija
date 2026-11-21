import { SessionWithTrack } from '../../../../../core/models/session.model';
import { buildSchedule, sessionDuration, sessionsOverlap, toggleSession } from './session-schedule';

const session = (id: string, over: Partial<SessionWithTrack> = {}): SessionWithTrack => ({
  id,
  event_id: 'e1',
  title: `Sesión ${id}`,
  description: null,
  capacity: 30,
  time_slot: 1,
  track_id: null,
  date: '2026-11-20',
  start_time: '09:00:00',
  end_time: '10:00:00',
  speaker: null,
  city: null,
  level: null,
  topic: null,
  track_name: null,
  enrolled_count: 0,
  ...over,
});

// Escenario DevFest: la hackathon dura 2 h y se cruza con el codelab de las 10:00.
const codelab9 = session('c9', { track_name: 'codelab 1' });
const hackathon = session('h', { track_name: 'hackaton', end_time: '11:00:00' });
const codelab10 = session('c10', {
  track_name: 'codelab 1',
  start_time: '10:00:00',
  end_time: '11:00:00',
});
const zen11 = session('z11', {
  track_name: 'zona zen',
  start_time: '11:00:00',
  end_time: '12:00:00',
});
const all = [codelab10, hackathon, zen11, codelab9];

describe('sessionsOverlap', () => {
  it('detecta sesiones que se cruzan aunque empiecen a distinta hora', () => {
    expect(sessionsOverlap(hackathon, codelab10)).toBe(true);
    expect(sessionsOverlap(hackathon, codelab9)).toBe(true);
  });

  it('no cuenta como choque terminar justo cuando empieza la otra', () => {
    expect(sessionsOverlap(codelab9, codelab10)).toBe(false);
    expect(sessionsOverlap(hackathon, zen11)).toBe(false);
  });

  it('ignora otro día, la misma sesión y sesiones sin horario', () => {
    expect(sessionsOverlap(hackathon, session('x', { date: '2026-11-21' }))).toBe(false);
    expect(sessionsOverlap(hackathon, hackathon)).toBe(false);
    expect(sessionsOverlap(hackathon, session('x', { start_time: null }))).toBe(false);
  });

  it('sin hora de fin, la sesión cuenta como un instante', () => {
    expect(
      sessionsOverlap(hackathon, session('x', { start_time: '10:30:00', end_time: null })),
    ).toBe(true);
    expect(
      sessionsOverlap(session('a', { end_time: null }), session('b', { end_time: null })),
    ).toBe(true);
  });
});

describe('toggleSession', () => {
  it('al elegir una sesión quita las que se cruzan con ella', () => {
    expect(toggleSession(['c10', 'z11'], hackathon, all)).toEqual(['z11', 'h']);
  });

  it('quita la sesión si ya estaba elegida', () => {
    expect(toggleSession(['h', 'z11'], hackathon, all)).toEqual(['z11']);
  });
});

describe('sessionDuration', () => {
  it('formatea horas y minutos', () => {
    expect(sessionDuration(hackathon)).toBe('2 h');
    expect(sessionDuration(session('x', { end_time: '10:30:00' }))).toBe('1 h 30 min');
    expect(sessionDuration(session('x', { end_time: '09:45:00' }))).toBe('45 min');
    expect(sessionDuration(session('x', { end_time: null }))).toBeNull();
  });
});

describe('buildSchedule', () => {
  it('agrupa por hora de inicio y marca la hackathon como en curso a las 10:00', () => {
    const [day] = buildSchedule(all);
    expect(day.blocks.map((b) => b.start)).toEqual(['09:00', '10:00', '11:00']);
    expect(day.blocks[0].sessions.map((s) => s.id)).toEqual(['c9', 'h']);
    expect(day.blocks[1].ongoing.map((s) => s.id)).toEqual(['h']);
    expect(day.blocks[2].ongoing).toEqual([]);
  });

  it('ordena los días y deja las sesiones sin horario al final', () => {
    const days = buildSchedule([
      session('b', { date: '2026-11-21' }),
      session('tbd', { start_time: null }),
      codelab9,
    ]);
    expect(days.map((d) => d.date)).toEqual(['2026-11-20', '2026-11-21']);
    expect(days[0].blocks.map((b) => b.start)).toEqual(['09:00', null]);
  });
});
