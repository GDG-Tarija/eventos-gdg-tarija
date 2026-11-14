import type { Event } from './event.model';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

/** Fecha en UTC formato básico: YYYYMMDDTHHMMSSZ. */
const utc = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, '');

export function googleCalendarUrl(e: Event): string {
  const end = e.date_end ?? new Date(e.date_start.getTime() + TWO_HOURS_MS);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${utc(e.date_start)}/${utc(end)}`,
    details: `Más info: https://eventos.gdgtarija.com/e/${e.slug}`,
    location: e.location_name || 'Online',
  });
  // URLSearchParams codifica el espacio como "+"; Google Calendar lo acepta, pero %20 es más seguro.
  return `https://calendar.google.com/calendar/render?${params.toString().replace(/\+/g, '%20')}`;
}
