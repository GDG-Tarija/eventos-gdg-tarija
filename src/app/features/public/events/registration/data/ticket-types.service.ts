import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../../../../../core/supabase/supabase.client';
import { TicketType } from '../../../../../models/ticket.model';

type TicketTypeRow = TicketType;

@Injectable({ providedIn: 'root' })
export class TicketTypesService {
  private readonly supabase = inject<SupabaseClient>(SUPABASE);

  async listByEventId(eventId: string): Promise<TicketType[]> {
    const { data, error } = await this.supabase
      .from('ticket_types')
      .select('id,event_id,name,price,ticket_capacity,payment_qr_url')
      .eq('event_id', eventId)
      .order('price', { ascending: true });

    if (error) throw error;

    const rows =
      (data as unknown as Array<TicketTypeRow & { price: unknown; ticket_capacity: unknown; payment_qr_url?: unknown }>) ?? [];
    return rows.map((r) => ({
      ...r,
      price: Number(r.price ?? 0),
      ticket_capacity: Number(r.ticket_capacity ?? 0),
      payment_qr_url: typeof r.payment_qr_url === 'string' ? r.payment_qr_url : undefined,
    }));
  }
}
