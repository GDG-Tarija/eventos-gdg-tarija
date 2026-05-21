import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PublicEventsService } from '../data/public-events.service';
import { Event } from '../data/event.model';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    <section class="gdg-page">
      <div class="gdg-container">
        @if (loading()) {
          <div class="gdg-card p-10 sm:p-14 max-w-3xl mx-auto text-center">
            <div class="flex justify-center">
              <mat-progress-spinner mode="indeterminate" diameter="36" aria-label="Cargando evento" />
            </div>
            <p class="mt-4 text-text-secondary">Cargando evento...</p>
          </div>
        } @else if (!event()) {
          <div class="gdg-card p-10 sm:p-14 max-w-3xl mx-auto text-center">
            <span class="material-symbols-rounded text-5xl text-text-muted" aria-hidden="true">event_busy</span>
            <h1 class="text-2xl font-bold mt-4 text-text-primary">Evento no encontrado</h1>
            <p class="mt-2 text-text-secondary">No existe un evento publicado con slug: <strong>{{ slug }}</strong></p>
          </div>
        } @else {
          <div class="gdg-card overflow-hidden max-w-4xl mx-auto">
            <div class="aspect-video bg-black/5">
              @if (event()!.banner_url) {
                <img
                  class="w-full h-full object-cover"
                  [src]="event()!.banner_url"
                  [alt]="event()!.title"
                />
              } @else {
                <div class="w-full h-full grid grid-cols-2 grid-rows-2">
                  <div class="bg-google-blue/20"></div>
                  <div class="bg-google-red/20"></div>
                  <div class="bg-google-yellow/20"></div>
                  <div class="bg-google-green/20"></div>
                </div>
              }
            </div>

            <div class="p-6 sm:p-10 space-y-6">
              <div class="flex items-start gap-4">
                @if (event()!.logo_url) {
                  <img
                    class="w-16 h-16 rounded-2xl object-cover bg-white border border-black/5"
                    [src]="event()!.logo_url"
                    [alt]="event()!.title"
                  />
                }

                <div class="min-w-0">
                  <div class="flex items-center gap-2 text-google-blue text-sm font-medium">
                    <span class="material-symbols-rounded text-base" aria-hidden="true">calendar_month</span>
                    <span>{{ dateLabel(event()!.date_start) }}</span>
                    @if (event()!.date_end) {
                      <span class="text-text-muted">-</span>
                      <span>{{ dateLabel(event()!.date_end!) }}</span>
                    }
                  </div>

                  <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary break-words">
                    {{ event()!.title }}
                  </h1>

                  <div class="mt-2 flex flex-wrap gap-3 text-sm text-text-secondary">
                    <span class="inline-flex items-center gap-1">
                      <span class="material-symbols-rounded text-base" aria-hidden="true">category</span>
                      <span>{{ event()!.event_type }}</span>
                    </span>
                    <span class="inline-flex items-center gap-1">
                      <span class="material-symbols-rounded text-base" aria-hidden="true">place</span>
                      <span>{{ locationLabel(event()!) }}</span>
                    </span>
                    <span class="inline-flex items-center gap-1">
                      <span class="material-symbols-rounded text-base" aria-hidden="true">group</span>
                      <span>Capacidad: {{ event()!.capacity }}</span>
                    </span>
                    @if (event()!.available_spots !== undefined) {
                      <span class="inline-flex items-center gap-1">
                        <span class="material-symbols-rounded text-base" aria-hidden="true">confirmation_number</span>
                        <span>Disponibles: {{ event()!.available_spots }}</span>
                      </span>
                    }
                  </div>
                </div>
              </div>

              @if (event()!.description) {
                <p class="text-text-secondary whitespace-pre-line">{{ event()!.description }}</p>
              }

              <div class="gdg-card p-5">
                  <div class="text-sm text-text-secondary">
                  <div><strong>Slug:</strong> {{ event()!.slug }}</div>
                  <div><strong>Published:</strong> {{ event()!.is_published }}</div>
                  @if (event()!.category) { <div><strong>Category:</strong> {{ event()!.category }}</div> }
                  @if (event()!.address_link) { <div><strong>Address:</strong> {{ event()!.address_link }}</div> }
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class EventDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly events = inject(PublicEventsService);

  readonly loading = signal(true);
  readonly event = signal<Event | null>(null);

  get slug(): string {
    return this.route.snapshot.paramMap.get('slug') ?? '';
  }

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    this.event.set(await this.events.getBySlug(this.slug));
    this.loading.set(false);
  }

  dateLabel(date: Date): string {
    return new Intl.DateTimeFormat('es-BO', {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
    }).format(date);
  }

  locationLabel(e: Event): string {
    if (e.location_name) return e.location_name;
    if (e.location_type === 'VIRTUAL') return 'Virtual';
    if (e.location_type === 'HYBRID') return 'Híbrido';
    return 'Presencial';
  }
}
