import { inject, Injectable, signal } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../../../../core/supabase/supabase.client';
import { environment } from '../../../../../environments/environment';
import { Event } from './event.model';

type EventRow = Omit<Event, 'date_start' | 'date_end'> & {
  date_start: string;
  date_end: string | null;
};

@Injectable({ providedIn: 'root' })
export class PublicEventsService {
  private readonly supabase = inject<SupabaseClient>(SUPABASE);

  readonly events = signal<Event[]>([]);
  readonly isEventLoading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    void this.listPublished();
  }

  async listPublished(): Promise<void> {
    this.isEventLoading.set(true);
    this.error.set(null);

    const { data, error } = await this.supabase
      .from('events')
      .select(
        [
          'id',
          'title',
          'slug',
          'event_type',
          'capacity',
          'date_start',
          'date_end',
          'is_published',
          'description',
          'image_url',
          'logo_url',
          'banner_url',
          'location_type',
          'location_name',
          'address_link',
          'category',
        ].join(','),
      )
      .eq('is_published', true)
      .order('date_start', { ascending: true });

    if (error) {
      if (!environment.production) {
        // eslint-disable-next-line no-console
        console.warn('[PublicEventsService] listPublished error', error);
      }
      this.error.set(error.message);
      this.events.set([]);
      this.isEventLoading.set(false);
      return;
    }

    const events = (data as unknown as EventRow[]).map((row) => ({
      ...row,
      date_start: new Date(row.date_start),
      date_end: row.date_end ? new Date(row.date_end) : undefined,
    }));

    this.events.set(events);
    this.isEventLoading.set(false);
  }

  async getBySlug(slug: string): Promise<Event | null> {
    const { data, error } = await this.supabase
      .from('events')
      .select(
        [
          'id',
          'title',
          'slug',
          'event_type',
          'capacity',
          'date_start',
          'date_end',
          'is_published',
          'description',
          'image_url',
          'logo_url',
          'banner_url',
          'location_type',
          'location_name',
          'address_link',
          'category',
        ].join(','),
      )
      .eq('slug', slug)
      .maybeSingle();

    if (error || !data) {
      if (error && !environment.production) {
        // eslint-disable-next-line no-console
        console.warn('[PublicEventsService] getBySlug error', error);
      }
      return null;
    }

    const row = data as unknown as EventRow;
    return {
      ...row,
      date_start: new Date(row.date_start),
      date_end: row.date_end ? new Date(row.date_end) : undefined,
    };
  }
}
