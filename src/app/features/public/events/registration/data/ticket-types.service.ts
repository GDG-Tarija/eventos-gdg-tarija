import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../../../../../core/supabase/supabase.client';
import { TicketType } from '../../../../../models/ticket.model';
import { AvailabilityRow, buildTicketTypes, TicketTypeRow } from './ticket-availability';

@Injectable({ providedIn: 'root' })
export class TicketTypesService {
  private readonly supabase = inject<SupabaseClient>(SUPABASE);

  async listByEventId(eventId: string): Promise<TicketType[]> {
    const [typesRes, availabilityRes] = await Promise.all([
      this.supabase
        .from('ticket_types')
        .select('id,event_id,name,price,ticket_capacity,payment_qr_url,image_url,description')
        .eq('event_id', eventId),
      this.supabase.rpc('get_ticket_availability', { p_event_id: eventId }),
    ]);

    if (typesRes.error) throw typesRes.error;
    if (availabilityRes.error) throw availabilityRes.error;

    return buildTicketTypes(
      (typesRes.data as unknown as TicketTypeRow[]) ?? [],
      (availabilityRes.data as unknown as AvailabilityRow[]) ?? [],
    );
  }
}
