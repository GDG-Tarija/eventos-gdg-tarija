import { Injectable, inject } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../../../../core/supabase/supabase.client';
import { RegistrationStatus } from '../../../../models/registration.model';
import { Event } from '../../events/data/event.model';
import { isPast } from '../../events/data/event-timing';

export interface ProfileSession {
  title: string;
  /** "09:00–10:30" */
  time: string;
}

export interface ProfileRegistration {
  id: string;
  status: RegistrationStatus;
  ticketName: string;
  attended: boolean;
  /** Solo los campos que usan la página y el enlace de calendario. */
  event: Event;
  sessions: ProfileSession[];
}

export interface ProfileData {
  upcoming: ProfileRegistration[];
  past: ProfileRegistration[];
  attendedCount: number;
}

export interface RawProfileRegistration {
  id: string;
  status: string;
  events: {
    id: string;
    title: string;
    slug: string;
    location_name: string | null;
    date_start: string;
    date_end: string | null;
  } | null;
  ticket_types: { name: string } | null;
  scan_logs: { id: string }[] | null;
  session_registrations: { sessions: { title: string; start_time: string; end_time: string } | null }[] | null;
}

const hhmm = (t: string) => t.slice(0, 5);

/** Agrupa en próximos (más cercano primero) e historial (más reciente primero). */
export function buildProfileData(rows: RawProfileRegistration[], now = new Date()): ProfileData {
  const items: ProfileRegistration[] = [];
  for (const r of rows) {
    if (!r.events) continue;
    items.push({
      id: r.id,
      status: r.status as RegistrationStatus,
      ticketName: r.ticket_types?.name ?? 'Entrada General',
      attended: (r.scan_logs?.length ?? 0) > 0,
      event: {
        id: r.events.id,
        title: r.events.title,
        slug: r.events.slug,
        location_name: r.events.location_name ?? undefined,
        date_start: new Date(r.events.date_start),
        date_end: r.events.date_end ? new Date(r.events.date_end) : undefined,
      } as Event,
      sessions: (r.session_registrations ?? [])
        .map((s) => s.sessions)
        .filter((s): s is NonNullable<typeof s> => !!s)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
        .map((s) => ({ title: s.title, time: `${hhmm(s.start_time)}–${hhmm(s.end_time)}` })),
    });
  }
  const start = (i: ProfileRegistration) => i.event.date_start.getTime();
  return {
    upcoming: items.filter((i) => !isPast(i.event, now)).sort((a, b) => start(a) - start(b)),
    past: items.filter((i) => isPast(i.event, now)).sort((a, b) => start(b) - start(a)),
    attendedCount: items.filter((i) => i.attended).length,
  };
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly supabase = inject<SupabaseClient>(SUPABASE);

  async loadMine(userId: string): Promise<ProfileData> {
    const { data, error } = await this.supabase
      .from('registrations')
      .select(
        `id, status,
         events!inner (id, title, slug, location_name, date_start, date_end),
         ticket_types (name),
         scan_logs (id),
         session_registrations (sessions (title, start_time, end_time))`,
      )
      .eq('user_id', userId);
    if (error) throw error;
    return buildProfileData((data ?? []) as unknown as RawProfileRegistration[]);
  }
}
