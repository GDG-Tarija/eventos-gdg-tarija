import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PublicEventsService } from '../data/public-events.service';
import { Event } from '../data/event.model';
import { EventRegistrationCheckout } from '../registration/components/event-registration-checkout';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [RouterLink, MatProgressSpinnerModule, EventRegistrationCheckout],
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
          <div class="max-w-5xl mx-auto">
            <div class="mb-4">
              <a
                class="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
                [routerLink]="['/']"
              >
                <span class="material-symbols-rounded text-base" aria-hidden="true">arrow_back</span>
                <span>Volver a eventos</span>
              </a>
            </div>

            <div class="gdg-card overflow-hidden">
            <div class="relative h-44 sm:h-56 md:h-64 bg-black/5">
              @if (event()!.banner_url) {
                <img
                  class="absolute inset-0 w-full h-full object-cover"
                  [src]="event()!.banner_url"
                  [alt]="event()!.title"
                />
              } @else {
                <div class="absolute inset-0 w-full h-full grid grid-cols-2 grid-rows-2">
                  <div class="bg-google-blue/20"></div>
                  <div class="bg-google-red/20"></div>
                  <div class="bg-google-yellow/20"></div>
                  <div class="bg-google-green/20"></div>
                </div>
              }

              <div class="absolute inset-0 bg-black/10"></div>
            </div>

            <div class="p-6 sm:p-10 space-y-10">
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

                  <div class="mt-3 flex flex-wrap gap-2 text-sm text-text-secondary">
                    <span class="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-3 py-1">
                      <span class="material-symbols-rounded text-base" aria-hidden="true">category</span>
                      <span>{{ event()!.event_type }}</span>
                    </span>
                    <span class="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-3 py-1 max-w-full">
                      <span class="material-symbols-rounded text-base" aria-hidden="true">place</span>
                      <span class="min-w-0 truncate">{{ locationLabel(event()!) }}</span>
                    </span>
                    @if (event()!.capacity) {
                      <span class="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-3 py-1">
                        <span class="material-symbols-rounded text-base" aria-hidden="true">group</span>
                        <span>Capacidad: {{ event()!.capacity }}</span>
                      </span>
                    }
                    @if (event()!.available_spots !== undefined) {
                      <span class="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-3 py-1">
                        <span class="material-symbols-rounded text-base" aria-hidden="true">confirmation_number</span>
                        <span>Disponibles: {{ event()!.available_spots }}</span>
                      </span>
                    }
                  </div>
                </div>
              </div>

              @if (event()!.description) {
                <div class="gdg-card p-5 sm:p-6 bg-surface-main">
                  <h2 class="text-base font-semibold text-text-primary">Sobre el evento</h2>
                  <p class="mt-2 text-text-secondary whitespace-pre-line">{{ event()!.description }}</p>
                </div>
              }

              <app-event-registration-checkout [event]="event()!" />
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
