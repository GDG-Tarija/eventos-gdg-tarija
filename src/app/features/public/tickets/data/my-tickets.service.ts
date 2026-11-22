import { Injectable, inject } from '@angular/core';
import { Database, SUPABASE } from '../../../../core/supabase/supabase.client';
import { RegistrationStatus } from '../../../../models/registration.model';
import { Event } from '../../events/data/event.model';
import { isPast } from '../../events/data/event-timing';

interface TicketSession {
  id: string;
  title: string;
  dateLabel: string;
  time: string;
}

interface TicketReceipt {
  id: string;
  status: RegistrationStatus;
  ticketName: string;
  attended: boolean;
}

export interface EventTicket extends TicketReceipt {
  event: Pick<Event, 'id' | 'title' | 'slug' | 'location_name' | 'date_start' | 'date_end'>;
  /** El evento tiene sorteo por tickets (hay actividades cargadas). */
  hasRaffle: boolean;
  sessions: TicketSession[];
}

export interface MyTicketsData {
  upcoming: EventTicket[];
  past: EventTicket[];
  unavailable: TicketReceipt[];
  attendedCount: number;
}

type Tables = Database['public']['Tables'];
type SessionSchedule = Pick<Tables['sessions']['Row'], 'id' | 'title' | 'date' | 'start_time' | 'end_time'>;

// sessions.date es una fecha de calendario, sin hora ni zona horaria.
const sessionDay = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'long', timeZone: 'UTC' });

function compareScheduledValue(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  return b === null ? -1 : a.localeCompare(b);
}

export interface TicketRegistrationRow {
  id: string;
  status: string;
  events:
    | (Pick<Tables['events']['Row'], 'id' | 'title' | 'slug' | 'location_name' | 'date_start' | 'date_end'> & {
        point_activities?: { count: number }[];
      })
    | null;
  ticket_types: { name: string } | null;
  scan_logs: { id: string }[] | null;
  session_registrations: { sessions: SessionSchedule | null }[] | null;
}

function sessionTime(session: SessionSchedule): string {
  const start = session.start_time?.slice(0, 5);
  const end = session.end_time?.slice(0, 5);
  if (!start) return end ? `Hasta ${end}` : 'Horario por confirmar';
  return end ? `${start}–${end}` : start;
}

/** Agrupa en próximos (más cercano primero) e historial (más reciente primero). */
export function buildMyTickets(rows: TicketRegistrationRow[], now = new Date()): MyTicketsData {
  const items: EventTicket[] = [];
  const unavailable: TicketReceipt[] = [];
  let attendedCount = 0;
  for (const r of rows) {
    const receipt: TicketReceipt = {
      id: r.id,
      status: r.status as RegistrationStatus,
      ticketName: r.ticket_types?.name ?? 'Entrada General',
      attended: (r.scan_logs?.length ?? 0) > 0,
    };
    if (receipt.attended) attendedCount++;
    if (!r.events) {
      unavailable.push(receipt);
      continue;
    }
    items.push({
      ...receipt,
      event: {
        id: r.events.id,
        title: r.events.title,
        slug: r.events.slug,
        location_name: r.events.location_name ?? undefined,
        date_start: new Date(r.events.date_start),
        date_end: r.events.date_end ? new Date(r.events.date_end) : undefined,
      },
      hasRaffle: (r.events.point_activities?.[0]?.count ?? 0) > 0,
      sessions: (r.session_registrations ?? [])
        .map((s) => s.sessions)
        .filter((s): s is NonNullable<typeof s> => !!s)
        .sort((a, b) => compareScheduledValue(a.date, b.date) || compareScheduledValue(a.start_time, b.start_time))
        .map((s) => ({
          id: s.id,
          title: s.title,
          dateLabel: s.date ? sessionDay.format(new Date(s.date)) : 'Fecha por confirmar',
          time: sessionTime(s),
        })),
    });
  }
  const start = (i: EventTicket) => i.event.date_start.getTime();
  return {
    upcoming: items.filter((i) => !isPast(i.event, now)).sort((a, b) => start(a) - start(b)),
    past: items.filter((i) => isPast(i.event, now)).sort((a, b) => start(b) - start(a)),
    unavailable,
    attendedCount,
  };
}

@Injectable({ providedIn: 'root' })
export class MyTicketsService {
  private readonly supabase = inject(SUPABASE);

  async loadMine(userId: string): Promise<MyTicketsData> {
    const { data, error } = await this.supabase
      .from('registrations')
      .select(
        `id, status,
         events (id, title, slug, location_name, date_start, date_end, point_activities (count)),
         ticket_types (name),
         scan_logs (id),
         session_registrations (sessions (id, title, date, start_time, end_time))`,
      )
      .eq('user_id', userId);
    if (error) throw error;
    return buildMyTickets(data ?? []);
  }
}
