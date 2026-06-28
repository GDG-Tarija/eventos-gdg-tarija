import { Injectable, inject } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../../../../core/supabase/supabase.client';
import { CertificateDetailData, CertificateItem } from './certificate.model';
import { EventRole } from '../../../../models/registration.model';

type RawRegistrationSelect = {
  id: string;
  event_id: string;
  user_id: string | null;
  event_role: string;
  created_at: string | null;
  events: {
    id: string;
    title: string;
    slug: string;
    banner_url: string | null;
    date_start: string;
    date_end: string | null;
  } | null;
  ticket_types: {
    id: string;
    name: string;
  } | null;
  users: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  scan_logs: {
    id: string;
    scan_type: string;
    scanned_at: string | null;
  }[] | null;
};

@Injectable({ providedIn: 'root' })
export class CertificatesService {
  private readonly supabase = inject<SupabaseClient>(SUPABASE);

  async listMyCertificates(userId: string): Promise<CertificateItem[]> {
    if (!userId) return [];

    const { data, error } = await this.supabase
      .from('registrations')
      .select(`
        id,
        event_id,
        user_id,
        event_role,
        created_at,
        events!inner (
          id,
          title,
          slug,
          banner_url,
          date_start,
          date_end
        ),
        ticket_types (
          id,
          name
        ),
        scan_logs (
          id,
          scan_type,
          scanned_at
        )
      `)
      .eq('user_id', userId);

    if (error || !data) {
      console.error('[CertificatesService.listMyCertificates] Error:', error);
      return [];
    }

    const rows = data as unknown as RawRegistrationSelect[];
    const items: CertificateItem[] = [];

    for (const reg of rows) {
      if (!reg.events) continue;
      const logs = reg.scan_logs || [];
      // Solo consideramos que tiene certificado si asistió (al menos 1 escaneo registrado)
      if (logs.length === 0) continue;

      let checkInDate = new Date();
      if (logs[0]?.scanned_at) {
        checkInDate = new Date(logs[0].scanned_at);
      } else if (reg.created_at) {
        checkInDate = new Date(reg.created_at);
      }

      items.push({
        registrationId: reg.id,
        eventId: reg.events.id,
        eventTitle: reg.events.title,
        eventSlug: reg.events.slug,
        eventBannerUrl: reg.events.banner_url,
        eventDateStart: new Date(reg.events.date_start),
        eventDateEnd: reg.events.date_end ? new Date(reg.events.date_end) : null,
        eventRole: reg.event_role as EventRole,
        ticketName: reg.ticket_types?.name || 'Entrada General',
        checkInDate,
      });
    }

    return items;
  }

  async getCertificateById(registrationId: string): Promise<CertificateDetailData | null> {
    if (!registrationId) return null;

    const { data, error } = await this.supabase
      .from('registrations')
      .select(`
        id,
        event_id,
        user_id,
        event_role,
        created_at,
        events!inner (
          id,
          title,
          slug,
          banner_url,
          date_start,
          date_end
        ),
        ticket_types (
          id,
          name
        ),
        users (
          id,
          first_name,
          last_name,
          email
        ),
        scan_logs (
          id,
          scan_type,
          scanned_at
        )
      `)
      .eq('id', registrationId)
      .maybeSingle();

    if (error || !data) {
      console.error('[CertificatesService.getCertificateById] Error:', error);
      return null;
    }

    const reg = data as unknown as RawRegistrationSelect;
    if (!reg.events) return null;

    const logs = reg.scan_logs || [];
    if (logs.length === 0) return null;

    let checkInDate = new Date();
    if (logs[0]?.scanned_at) {
      checkInDate = new Date(logs[0].scanned_at);
    } else if (reg.created_at) {
      checkInDate = new Date(reg.created_at);
    }

    return {
      registrationId: reg.id,
      eventId: reg.events.id,
      eventTitle: reg.events.title,
      eventSlug: reg.events.slug,
      eventBannerUrl: reg.events.banner_url,
      eventDateStart: new Date(reg.events.date_start),
      eventDateEnd: reg.events.date_end ? new Date(reg.events.date_end) : null,
      eventRole: reg.event_role as EventRole,
      ticketName: reg.ticket_types?.name || 'Entrada General',
      checkInDate,
      userFirstName: reg.users?.first_name || 'Asistente',
      userLastName: reg.users?.last_name || '',
      userEmail: reg.users?.email || '',
    };
  }
}
