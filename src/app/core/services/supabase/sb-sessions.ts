import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../../supabase/supabase.client';
import { SessionWithTrack } from '../../models/session.model';

type TrackRow = { nombre: string | null };
type SessionRow = {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  capacity: number;
  time_slot: number;
  track_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  tracks: TrackRow | null;
};

type SessionRegCountRow = { session_id: string };

@Injectable({ providedIn: 'root' })
export class SbSessions {
  private readonly supabase = inject<SupabaseClient>(SUPABASE);

  async listByEvent(eventId: string): Promise<SessionWithTrack[]> {
    const { data: rows, error: sessErr } = await this.supabase
      .from('sessions')
      .select('id, event_id, title, description, capacity, time_slot, track_id, created_at, updated_at, tracks(nombre)')
      .eq('event_id', eventId)
      .order('time_slot', { ascending: true })
      .order('track_id', { ascending: true });

    if (sessErr) {
      throw new Error(`[sessions.listByEvent] ${sessErr.message}`);
    }

    if (!rows || rows.length === 0) return [];

    const sessionIds = (rows as unknown as SessionRow[]).map((r) => r.id);

    const { data: counts, error: countErr } = await this.supabase
      .from('session_registrations')
      .select('session_id')
      .in('session_id', sessionIds);

    if (countErr) {
      throw new Error(`[sessions.listByEvent.counts] ${countErr.message}`);
    }

    const countMap = new Map<string, number>();
    for (const row of (counts ?? []) as unknown as SessionRegCountRow[]) {
      countMap.set(row.session_id, (countMap.get(row.session_id) ?? 0) + 1);
    }

    return (rows as unknown as SessionRow[]).map((r) => ({
      id: r.id,
      event_id: r.event_id,
      title: r.title,
      description: r.description,
      capacity: r.capacity,
      time_slot: r.time_slot,
      track_id: r.track_id,
      created_at: r.created_at,
      updated_at: r.updated_at,
      track_name: r.tracks?.nombre ?? null,
      enrolled_count: countMap.get(r.id) ?? 0,
    }));
  }

  async saveSessionRegistrations(registrationId: string, sessionIds: string[]): Promise<void> {
    if (sessionIds.length === 0) return;

    const rows = sessionIds.map((session_id) => ({ registration_id: registrationId, session_id }));

    const { error } = await this.supabase.from('session_registrations').insert(rows);

    if (error) {
      throw new Error(`[sessions.saveRegistrations] ${error.message}`);
    }
  }
}
