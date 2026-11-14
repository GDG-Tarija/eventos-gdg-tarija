import { Event } from './event.model';

type Timed = Pick<Event, 'date_start' | 'date_end'>;

const TZ = 'America/La_Paz';
const DAY_MS = 86_400_000;

export function eventEnd(e: Timed): Date {
  if (e.date_end) return e.date_end;
  const end = new Date(e.date_start);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function isPast(e: Timed, now = new Date()): boolean {
  return now > eventEnd(e);
}

export function isLive(e: Timed, now = new Date()): boolean {
  return e.date_start <= now && now <= eventEnd(e);
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function relativeLabel(e: Timed, now = new Date()): string | null {
  if (isPast(e, now)) return null;
  if (isLive(e, now)) return 'En curso';
  const days = Math.round((startOfDay(e.date_start) - startOfDay(now)) / DAY_MS);
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  return days <= 7 ? `En ${days} días` : null;
}

export function splitEvents<T extends Timed>(events: T[], now = new Date()): { upcoming: T[]; past: T[] } {
  const upcoming = events.filter((e) => !isPast(e, now));
  const past = events.filter((e) => isPast(e, now));
  upcoming.sort((a, b) => a.date_start.getTime() - b.date_start.getTime());
  past.sort((a, b) => b.date_start.getTime() - a.date_start.getTime());
  return { upcoming, past };
}

const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });

export function formatEventDate(e: Timed, mode: 'upcoming' | 'past'): string {
  const multiDay = !!e.date_end && dayKey.format(e.date_end) !== dayKey.format(e.date_start);
  if (mode === 'past') {
    const fmt = new Intl.DateTimeFormat('es-BO', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' });
    return multiDay ? fmt.formatRange(e.date_start, e.date_end!) : fmt.format(e.date_start);
  }
  const time = new Intl.DateTimeFormat('es-BO', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(e.date_start);
  if (multiDay) {
    const range = new Intl.DateTimeFormat('es-BO', { timeZone: TZ, day: 'numeric', month: 'short' });
    return `${range.formatRange(e.date_start, e.date_end!)} · ${time}`;
  }
  const parts = new Intl.DateTimeFormat('es-BO', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' })
    .formatToParts(e.date_start)
    .filter((p) => p.type === 'weekday' || p.type === 'day' || p.type === 'month')
    .map((p) => p.value.replace('.', ''));
  return `${parts.join(' ')} · ${time}`;
}
