import { Injectable, inject } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../../../../core/supabase/supabase.client';
import { isRaffleRole } from '../../../../models/registration.model';

export type TicketKind = 'checkin' | 'activity' | 'networking';

export interface Ticket {
  kind: TicketKind;
  /** Nombre de la actividad o de la persona; null si la actividad se borró. */
  label: string | null;
  at: string;
  /** Networking: true si lo escaneaste tú, false si te escanearon. */
  by_me: boolean;
}

/** Respuesta de la RPC my_tickets. */
export interface MyTickets {
  registration_id: string | null;
  event_role: string | null;
  checked_in: boolean;
  /** Puede dar tickets de actividad (speaker, sponsor, staff). */
  can_award: boolean;
  net_count: number;
  net_cap: number;
  tickets: Ticket[];
}

export type ScanStatus =
  | 'ok'
  | 'already'
  | 'limit'
  | 'self'
  | 'not_checked_in'
  | 'not_registered'
  | 'forbidden'
  | 'invalid'
  | 'invalid_activity';

/** Respuesta de la RPC scan_ticket. */
export interface ScanResult {
  status: ScanStatus;
  /** Solo viene si quien escanea tiene permiso; null si la cuenta se borró. */
  name?: string | null;
  mine_added?: boolean;
  theirs_added?: boolean;
  my_net?: number;
  net_cap?: number;
}

export interface PointActivity {
  id: string;
  name: string;
}

export interface DrawResult {
  status: 'ok' | 'empty';
  registration_id?: string;
  name?: string | null;
  tickets?: number;
  participants?: number;
}

export interface RaffleWinner {
  id: string;
  prize: string;
  tickets: number;
  name: string;
  /** Tachado: no estaba o se anuló. Sigue fuera del sorteo y su premio se sortea de nuevo. */
  voided: boolean;
}

/** Quien entra al próximo sorteo, con sus tickets (lo que ve el proyector). */
export interface PoolEntry {
  registrationId: string;
  name: string;
  tickets: number;
  /** Foto de la cuenta de Google, si tiene. */
  avatarUrl: string | null;
}

export interface PoolRow {
  id: string;
  status: string;
  event_role: string;
  user_id: string | null;
  users: { first_name: string; last_name: string; avatar_url?: string | null } | null;
  scan_logs: { scan_type: string }[] | null;
}

/**
 * Espejo de raffle_tickets/draw_raffle solo para mostrar el grupo y las chances en pantalla: el ganador
 * lo elige siempre el servidor. Entra quien está CONFIRMED, como Asistente o Comunidad aliada, con cuenta,
 * check-in y sin premio;
 * cuentan las actividades que existen y el networking con inscripciones de este evento.
 */
export function buildPool(rows: PoolRow[], activityIds: string[], winnerIds: string[]): PoolEntry[] {
  const activities = new Set(activityIds);
  const winners = new Set(winnerIds);
  const eventRegistrations = new Set(rows.map((r) => r.id));
  const pool: PoolEntry[] = [];
  for (const r of rows) {
    if (r.status !== 'CONFIRMED' || !isRaffleRole(r.event_role) || !r.user_id || winners.has(r.id)) continue;
    const types = (r.scan_logs ?? []).map((l) => l.scan_type);
    if (!types.includes('checkin')) continue;
    const tickets =
      1 +
      types.filter((t) => t.startsWith('pts:') && activities.has(t.slice(4))).length +
      types.filter((t) => t.startsWith('net:') && eventRegistrations.has(t.slice(4))).length;
    const name = `${r.users?.first_name ?? ''} ${r.users?.last_name ?? ''}`.trim() || 'Sin nombre';
    pool.push({ registrationId: r.id, name, tickets, avatarUrl: r.users?.avatar_url ?? null });
  }
  return pool.sort((a, b) => b.tickets - a.tickets || a.name.localeCompare(b.name));
}

interface RawWinner {
  id: string;
  prize: string;
  tickets: number;
  voided_at: string | null;
  registrations: { users: { first_name: string; last_name: string } | null } | null;
}

export interface ScanMessage {
  tone: 'ok' | 'warn' | 'error';
  text: string;
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** El QR de entrada es el id de la inscripción; se acepta también dentro de un link. */
export function extractRegistrationId(text: string): string | null {
  return text.match(UUID)?.[0].toLowerCase() ?? null;
}

/**
 * Lo que ve quien escanea después de cada lectura. `activity`: en qué modo escaneó;
 * `inRaffle`: si quien escanea participa del sorteo (a un sponsor no se le habla de "tus" tickets).
 */
export function scanMessage(r: ScanResult, activity: boolean, inRaffle = true): ScanMessage {
  const who = r.name || 'esta persona';
  switch (r.status) {
    case 'ok':
      if (r.my_net === undefined) return { tone: 'ok', text: `+1 ticket para ${who}` };
      if (!inRaffle) {
        return r.theirs_added
          ? { tone: 'ok', text: `+1 ticket de networking para ${who}` }
          : { tone: 'warn', text: `${who} ya llegó a su tope de networking.` };
      }
      if (r.mine_added && r.theirs_added) {
        return {
          tone: 'ok',
          text: `¡+1 ticket para ti y para ${who}! Networking ${r.my_net}/${r.net_cap}`,
        };
      }
      return r.mine_added
        ? { tone: 'ok', text: `+1 ticket para ti. ${who} ya llegó a su tope de networking.` }
        : { tone: 'ok', text: `+1 ticket para ${who}. Tú ya llegaste a tu tope de ${r.net_cap}.` };
    case 'already':
      return activity
        ? { tone: 'warn', text: `${who} ya sumó el ticket de esta actividad.` }
        : { tone: 'warn', text: `Ya hicieron networking con ${who}.` };
    case 'limit':
      return { tone: 'warn', text: `Los dos ya llegaron al tope de networking.` };
    case 'self':
      return { tone: 'warn', text: 'Ese es tu propio QR. Escanea el de otra persona.' };
    case 'not_checked_in':
      return activity
        ? { tone: 'warn', text: `${who} todavía no hizo check-in en la entrada.` }
        : {
            tone: 'warn',
            text: 'Para sumar networking, los dos deben haber hecho check-in en la entrada.',
          };
    case 'not_registered':
      return {
        tone: 'error',
        text: 'Necesitas una inscripción confirmada en este evento para hacer networking.',
      };
    case 'forbidden':
      return {
        tone: 'error',
        text: 'Solo speakers, sponsors y staff pueden dar tickets de actividad.',
      };
    case 'invalid_activity':
      return { tone: 'error', text: 'La actividad elegida no es de este evento.' };
    case 'invalid':
      return { tone: 'error', text: 'Este QR no es una entrada confirmada de este evento.' };
    default:
      return { tone: 'error', text: 'No se pudo registrar. Inténtalo de nuevo.' };
  }
}

@Injectable({ providedIn: 'root' })
export class RaffleService {
  private readonly supabase = inject<SupabaseClient>(SUPABASE);

  async myTickets(eventId: string): Promise<MyTickets> {
    const { data, error } = await this.supabase.rpc('my_tickets', { p_event_id: eventId });
    if (error) throw error;
    return data as MyTickets;
  }

  async scan(eventId: string, registrationId: string, activityId: string | null): Promise<ScanResult> {
    const { data, error } = await this.supabase.rpc('scan_ticket', {
      p_event_id: eventId,
      p_registration_id: registrationId,
      ...(activityId ? { p_activity_id: activityId } : {}),
    });
    if (error) throw error;
    return data as ScanResult;
  }

  async activities(eventId: string): Promise<PointActivity[]> {
    const { data, error } = await this.supabase
      .from('point_activities')
      .select('id, name')
      .eq('event_id', eventId)
      .order('name');
    if (error) throw error;
    return (data ?? []) as PointActivity[];
  }

  /** El evento tiene sorteo si tiene actividades cargadas. */
  async hasRaffle(eventId: string): Promise<boolean> {
    const { count, error } = await this.supabase
      .from('point_activities')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId);
    if (error) throw error;
    return (count ?? 0) > 0;
  }

  async myRole(): Promise<string | null> {
    const { data, error } = await this.supabase.rpc('get_my_role');
    if (error) throw error;
    return (data as string | null) ?? null;
  }

  async draw(eventId: string, prize: string): Promise<DrawResult> {
    const { data, error } = await this.supabase.rpc('draw_raffle', {
      p_event_id: eventId,
      p_prize: prize,
    });
    if (error) throw error;
    return data as DrawResult;
  }

  /** Solo para SUPERADMIN (RLS): todas las inscripciones del evento con sus escaneos. */
  async pool(eventId: string): Promise<PoolEntry[]> {
    const [regs, acts, wins] = await Promise.all([
      this.supabase
        .from('registrations')
        .select(
          'id, status, event_role, user_id, users (first_name, last_name, avatar_url), scan_logs (scan_type)',
        )
        .eq('event_id', eventId),
      this.supabase.from('point_activities').select('id').eq('event_id', eventId),
      this.supabase.from('raffle_winners').select('registration_id').eq('event_id', eventId),
    ]);
    const error = regs.error ?? acts.error ?? wins.error;
    if (error) throw error;
    return buildPool(
      (regs.data ?? []) as unknown as PoolRow[],
      (acts.data ?? []).map((a: { id: string }) => a.id),
      (wins.data ?? []).map((w: { registration_id: string }) => w.registration_id),
    );
  }

  async winners(eventId: string): Promise<RaffleWinner[]> {
    const { data, error } = await this.supabase
      .from('raffle_winners')
      .select('id, prize, tickets, voided_at, registrations (users (first_name, last_name))')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return ((data ?? []) as unknown as RawWinner[]).map((w) => ({
      id: w.id,
      prize: w.prize,
      tickets: w.tickets,
      voided: !!w.voided_at,
      name:
        `${w.registrations?.users?.first_name ?? ''} ${w.registrations?.users?.last_name ?? ''}`.trim() ||
        'Sin nombre',
    }));
  }

  /** Tachar (o restaurar) a un ganador: sigue en la lista y no vuelve a entrar al sorteo. */
  async setWinnerVoided(id: string, voided: boolean): Promise<void> {
    const { data, error } = await this.supabase
      .from('raffle_winners')
      .update({ voided_at: voided ? new Date().toISOString() : null })
      .eq('id', id)
      .select('id');
    if (error) throw error;
    // RLS no da error cuando no deja: devuelve cero filas.
    if (!data?.length) throw new Error('raffle winner not updated');
  }

  /** Eliminar a un ganador (de prueba): como si no hubiera salido, vuelve a participar. */
  async deleteWinner(id: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('raffle_winners')
      .delete()
      .eq('id', id)
      .select('id');
    if (error) throw error;
    if (!data?.length) throw new Error('raffle winner not deleted');
  }
}
