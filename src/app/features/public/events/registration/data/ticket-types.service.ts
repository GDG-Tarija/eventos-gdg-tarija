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
      .select('id,event_id,name,price,ticket_capacity')
      .eq('event_id', eventId)
      .order('price', { ascending: true });

    if (error) throw error;
    return (data as unknown as TicketTypeRow[]) ?? [];
  }
}
