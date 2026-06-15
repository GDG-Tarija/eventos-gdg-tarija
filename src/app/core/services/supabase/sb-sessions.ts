import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../../supabase/supabase.client';
import { SessionWithTrack } from '../../models/session.model';

@Injectable({ providedIn: 'root' })
export class SbSessions {
  private readonly supabase = inject<SupabaseClient>(SUPABASE);

  async listByEvent(eventId: string): Promise<SessionWithTrack[]> {
    console.log('[SbSessions] listByEvent - Iniciando carga para eventId:', eventId);
    
    const { data: rows, error: sessErr } = await this.supabase
      .from('sessions')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (sessErr) {
      console.error('[SbSessions] Error al obtener sesiones de Supabase:', sessErr);
      throw new Error(`[sessions.listByEvent] ${sessErr.message}`);
    }
    
    console.log('[SbSessions] Filas de sesiones crudas devueltas:', rows?.length ?? 0, rows);
    if (!rows || rows.length === 0) {
      console.warn('[SbSessions] No se encontraron sesiones para este evento.');
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionIds = (rows as any[]).map((r) => r.id as string);
    console.log('[SbSessions] IDs de sesiones a consultar registros:', sessionIds);

    const { data: counts, error: countErr } = await this.supabase
      .from('session_registrations')
      .select('session_id')
      .in('session_id', sessionIds);

    if (countErr) {
      console.error('[SbSessions] Error al obtener inscripciones de sesiones:', countErr);
      throw new Error(`[sessions.listByEvent.counts] ${countErr.message}`);
    }
    
    console.log('[SbSessions] Registros de sesión crudos devueltos:', counts?.length ?? 0, counts);

    const countMap = new Map<string, number>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (counts ?? []) as any[]) {
      const sid = row.session_id as string;
      countMap.set(sid, (countMap.get(sid) ?? 0) + 1);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped = (rows as any[]).map((r): SessionWithTrack => {
      // Registrar en consola si la fila tiene la propiedad track_id para verificar si la columna existe en el objeto devuelto
      if (r.track_id !== undefined) {
        console.log(`[SbSessions] Sesión "${r.title}" tiene track_id:`, r.track_id);
      } else {
        console.warn(`[SbSessions] Sesión "${r.title}" no contiene la propiedad track_id en el payload devuelto por Supabase.`);
      }

      return {
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
      };
    });

    console.log('[SbSessions] Sesiones mapeadas finales:', mapped);
    return mapped;
  }

  async saveSessionRegistrations(registrationId: string, sessionIds: string[]): Promise<void> {
    if (sessionIds.length === 0) return;
    const rows = sessionIds.map((session_id) => ({ registration_id: registrationId, session_id }));
    const { error } = await this.supabase.from('session_registrations').insert(rows);
    if (error) throw new Error(`[sessions.saveRegistrations] ${error.message}`);
  }
}
