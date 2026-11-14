import { eventEnd, formatEventDate, isLive, isPast, relativeLabel, splitEvents } from './event-timing';

const d = (s: string) => new Date(s);
// Local-time constructors keep the day-boundary tests timezone-robust.
const local = (day: number, h = 12) => new Date(2026, 10, day, h, 0, 0);
const now = local(14);

describe('event-timing', () => {
  it('without date_end an event stays upcoming until the end of its day', () => {
    const e = { date_start: local(14, 9) };
    expect(eventEnd(e).getHours()).toBe(23);
    expect(isPast(e, now)).toBe(false);
    expect(isPast(e, local(15, 0))).toBe(true);
  });

  it('isLive between start and end', () => {
    const e = { date_start: local(14, 9), date_end: local(14, 18) };
    expect(isLive(e, now)).toBe(true);
    expect(isLive(e, local(14, 19))).toBe(false);
    expect(isLive(e, local(14, 8))).toBe(false);
  });

  it('splitEvents orders upcoming ascending and past descending', () => {
    const a = { date_start: local(20) };
    const b = { date_start: local(16) };
    const c = { date_start: local(1) };
    const f = { date_start: local(5) };
    const { upcoming, past } = splitEvents([a, c, b, f], now);
    expect(upcoming).toEqual([b, a]);
    expect(past).toEqual([f, c]);
  });

  it('relativeLabel boundaries', () => {
    const at = (day: number) => relativeLabel({ date_start: local(day, 18) }, now);
    expect(at(14)).toBe('Hoy');
    expect(at(15)).toBe('Mañana');
    expect(at(21)).toBe('En 7 días');
    expect(at(22)).toBeNull();
    expect(at(1)).toBeNull();
    expect(relativeLabel({ date_start: local(14, 9), date_end: local(14, 18) }, now)).toBe('En curso');
  });

  it('formats upcoming, past and ranges', () => {
    const e = { date_start: d('2026-11-28T13:00:00Z') };
    const up = formatEventDate(e, 'upcoming');
    expect(up).toContain('28');
    expect(up).toContain('nov');
    expect(up).toContain('09:00');
    const past = formatEventDate(e, 'past');
    expect(past).toContain('noviembre');
    expect(past).toContain('2026');
    const range = formatEventDate({ ...e, date_end: d('2026-11-29T22:00:00Z') }, 'past');
    expect(range).toContain('28');
    expect(range).toContain('29');
  });
});
