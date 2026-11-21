import { SessionWithTrack } from '../../../../../core/models/session.model';

/** Sesiones que empiezan a la misma hora, más las que empezaron antes y siguen en curso. */
export interface ScheduleBlock {
  /** 'HH:MM', o null si la sesión aún no tiene horario. */
  start: string | null;
  sessions: SessionWithTrack[];
  ongoing: SessionWithTrack[];
}

export interface ScheduleDay {
  date: string | null;
  blocks: ScheduleBlock[];
}

/** Supabase devuelve 'HH:MM:SS'; se compara y muestra como 'HH:MM'. */
export function hhmm(t: string | null): string | null {
  return t ? t.substring(0, 5) : null;
}

function toMinutes(t: string): number {
  return Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
}

/**
 * Mismo criterio que el trigger `check_session_datetime_conflict`: chocan si es el mismo día y
 * empiezan a la vez o sus horarios se cruzan. Sin hora de fin, la sesión cuenta como un instante.
 */
export function sessionsOverlap(a: SessionWithTrack, b: SessionWithTrack): boolean {
  if (a.id === b.id || !a.date || a.date !== b.date) return false;
  const aStart = hhmm(a.start_time);
  const bStart = hhmm(b.start_time);
  if (!aStart || !bStart) return false;
  if (aStart === bStart) return true;
  const aEnd = hhmm(a.end_time) ?? aStart;
  const bEnd = hhmm(b.end_time) ?? bStart;
  return aStart < bEnd && bStart < aEnd;
}

/** Selecciona o quita `session`; al seleccionarla quita las que chocan con ella. */
export function toggleSession(
  selectedIds: readonly string[],
  session: SessionWithTrack,
  all: readonly SessionWithTrack[],
): string[] {
  if (selectedIds.includes(session.id)) return selectedIds.filter((id) => id !== session.id);
  const byId = new Map(all.map((s) => [s.id, s]));
  const kept = selectedIds.filter((id) => {
    const other = byId.get(id);
    return !other || !sessionsOverlap(other, session);
  });
  return [...kept, session.id];
}

/** "1 h", "1 h 30 min" o "45 min"; null si falta la hora de fin. */
export function sessionDuration(s: SessionWithTrack): string | null {
  const start = hhmm(s.start_time);
  const end = hhmm(s.end_time);
  if (!start || !end) return null;
  const minutes = toMinutes(end) - toMinutes(start);
  if (minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} h ${m} min`;
  return h ? `${h} h` : `${m} min`;
}

function groupBy<K>(
  items: readonly SessionWithTrack[],
  key: (s: SessionWithTrack) => K,
): Map<K, SessionWithTrack[]> {
  const map = new Map<K, SessionWithTrack[]>();
  for (const s of items) map.set(key(s), [...(map.get(key(s)) ?? []), s]);
  return map;
}

/** Agrupa por día y hora de inicio. Las sesiones sin horario van al final de su día. */
export function buildSchedule(sessions: readonly SessionWithTrack[]): ScheduleDay[] {
  const startKey = (start: string) => start || '99:99';
  return [...groupBy(sessions, (s) => s.date ?? '')]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, daySessions]) => ({
      date: date || null,
      blocks: [...groupBy(daySessions, (s) => hhmm(s.start_time) ?? '')]
        .sort(([a], [b]) => (startKey(a) < startKey(b) ? -1 : 1))
        .map(
          ([start, group]): ScheduleBlock => ({
            start: start || null,
            sessions: group.sort((a, b) => (a.track_name ?? '').localeCompare(b.track_name ?? '')),
            ongoing: start
              ? daySessions.filter((s) => {
                  const sStart = hhmm(s.start_time);
                  const sEnd = hhmm(s.end_time);
                  return !!sStart && !!sEnd && sStart < start && start < sEnd;
                })
              : [],
          }),
        ),
    }));
}
