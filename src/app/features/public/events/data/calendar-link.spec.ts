import { googleCalendarUrl } from './calendar-link';
import type { Event } from './event.model';

const base = {
  title: 'Café & Código 🚀',
  slug: 'cafe-codigo',
  date_start: new Date('2026-03-07T14:00:00Z'),
  date_end: new Date('2026-03-07T18:30:00Z'),
  location_name: 'Auditorio UAJMS',
} as Event;

describe('googleCalendarUrl', () => {
  it('usa fechas UTC en formato básico', () => {
    const p = new URL(googleCalendarUrl(base)).searchParams;
    expect(p.get('dates')).toBe('20260307T140000Z/20260307T183000Z');
  });

  it('codifica acentos y emoji, y se decodifican de vuelta', () => {
    const url = googleCalendarUrl(base);
    expect(url).not.toMatch(/[ é🚀]/u);
    const p = new URL(url).searchParams;
    expect(p.get('text')).toBe('Café & Código 🚀');
    expect(p.get('details')).toBe('Más info: https://eventos.gdgtarija.com/e/cafe-codigo');
    expect(p.get('location')).toBe('Auditorio UAJMS');
  });

  it('sin date_end termina 2 h después y sin lugar usa Online', () => {
    const p = new URL(googleCalendarUrl({ ...base, date_end: undefined, location_name: undefined })).searchParams;
    expect(p.get('dates')).toBe('20260307T140000Z/20260307T160000Z');
    expect(p.get('location')).toBe('Online');
  });
});
