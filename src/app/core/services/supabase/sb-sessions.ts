import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../../supabase/supabase.client';
import { SessionWithTrack } from '../../models/session.model';

@Injectable({ providedIn: 'root' })
export class SbSessions {
  private readonly supabase = inject<SupabaseClient>(SUPABASE);

  async listByEvent(eventId: string): Promise<SessionWithTrack[]> {
    // select('*') works with both the original schema and post-migration-005 schema.
    // time_slot / track_id / description default to safe values when the columns don't yet exist.
    const { data: rows, error: sessErr } = await this.supabase
      .from('sessions')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (sessErr) throw new Error(`[sessions.listByEvent] ${sessErr.message}`);
    if (!rows || rows.length === 0) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionIds = (rows as any[]).map((r) => r.id as string);

    const { data: counts, error: countErr } = await this.supabase
      .from('session_registrations')
      .select('session_id')
      .in('session_id', sessionIds);

    if (countErr) throw new Error(`[sessions.listByEvent.counts] ${countErr.message}`);

    const countMap = new Map<string, number>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (counts ?? []) as any[]) {
      const sid = row.session_id as string;
      countMap.set(sid, (countMap.get(sid) ?? 0) + 1);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (rows as any[]).map((r): SessionWithTrack => ({
      id: r.id as string,
      event_id: r.event_id as string,
      title: r.title as string,
      description: (r.description as string | null) ?? null,
      capacity: r.capacity as number,
      time_slot: (r.time_slot as number | null) ?? 1,
      track_id: (r.track_id as string | null) ?? null,
      date: (r.date as string | null) ?? null,
      start_time: (r.start_time as string | null) ?? null,
      end_time: (r.end_time as string | null) ?? null,
      speaker: (r.speaker as string | null) ?? null,
      city: (r.city as string | null) ?? null,
      level: (r.level as SessionWithTrack['level']) ?? null,
      topic: (r.topic as string | null) ?? null,
      created_at: (r.created_at as string | null) ?? null,
      updated_at: (r.updated_at as string | null) ?? null,
      track_name: null,
      enrolled_count: countMap.get(r.id as string) ?? 0,
    }));
  }

  async saveSessionRegistrations(registrationId: string, sessionIds: string[]): Promise<void> {
    if (sessionIds.length === 0) return;
    const rows = sessionIds.map((session_id) => ({ registration_id: registrationId, session_id }));
    const { error } = await this.supabase.from('session_registrations').insert(rows);
    if (error) throw new Error(`[sessions.saveRegistrations] ${error.message}`);
  }
}
