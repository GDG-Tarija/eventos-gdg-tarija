import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { Event } from '../../data/event.model';
import { EventImagePlaceholder } from '../event-image-placeholder/event-image-placeholder';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [RouterLink, MatButtonModule, EventImagePlaceholder],
  template: `
    <article
      class="gdg-card border border-black/5 overflow-hidden transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-sm cursor-pointer sm:h-[240px]"
      [routerLink]="['/e', event().slug]"
    >
      <div class="p-5 h-full">
        <div class="flex flex-col sm:flex-row sm:items-center gap-6 h-full">
          <!-- Image Section with hover micro-zoom -->
          <div
            class="w-auto h-full shrink-0 overflow-hidden rounded-full relative group-card-img bg-black/5 mx-auto sm:mx-0 flex items-center justify-center"
          >
            @if (event().logo_url) {
              <img
                [src]="event().logo_url"
                [alt]="event().title"
                class="w-auto h-auto max-w-full max-h-full object-contain rounded-full transition-transform duration-500 ease-in-out group-hover:scale-105"
              />
            } @else {
              <img
                src="https://res.cloudinary.com/dopkch3x9/image/upload/v1779579233/GDG_Bevy_DefaultEventThumbnail_2_vaeskpB_pggj5h.webp"
                [alt]="event().title"
                class="w-auto h-auto max-w-full max-h-full object-contain rounded-full transition-transform duration-500 ease-in-out group-hover:scale-105"
              />
            }
          </div>

          <!-- Content Section -->
          <div class="flex flex-col justify-between gap-3 flex-1 min-w-0 h-full">
            <div class="space-y-3 min-w-0">
              <!-- Metadata Row minimalista con bullets -->
              <div
                class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-semibold text-text-secondary"
              >
                <!-- Fecha -->
                <div class="flex items-center gap-1 text-google-blue">
                  <span class="material-symbols-rounded text-base" aria-hidden="true"
                    >calendar_month</span
                  >
                  <span>{{ dateLabel() }}</span>
                </div>

                <span class="text-black/15" aria-hidden="true">•</span>

                <!-- Modalidad -->
                <div class="flex items-center gap-1" [class]="locationClassText()">
                  <span class="material-symbols-rounded text-base" aria-hidden="true">{{
                    locationIcon()
                  }}</span>
                  <span>{{ locationText() }}</span>
                </div>

                <span class="text-black/15" aria-hidden="true">•</span>

                <!-- Capacidad de Asistentes -->
                <div class="flex items-center gap-1 text-text-secondary">
                  <span class="material-symbols-rounded text-base" aria-hidden="true">group</span>
                  <span>{{ event().capacity }} asistentes</span>
                </div>

                <!-- Alerta de Cupos / Agotado minimalista -->
                @if (
                  event().available_spots !== undefined &&
                  event().available_spots! <= 10 &&
                  event().available_spots! > 0
                ) {
                  <span class="text-black/15" aria-hidden="true">•</span>
                  <div class="flex items-center gap-1 text-google-red animate-pulse">
                    <span class="material-symbols-rounded text-base" aria-hidden="true">alarm</span>
                    <span>¡Solo {{ event().available_spots }} cupos!</span>
                  </div>
                } @else if (event().available_spots === 0 || event().is_full) {
                  <span class="text-black/15" aria-hidden="true">•</span>
                  <div class="flex items-center gap-1 text-text-muted">
                    <span class="material-symbols-rounded text-base" aria-hidden="true">block</span>
                    <span>Agotado</span>
                  </div>
                }
              </div>

              <!-- Título -->
              <h3
                class="text-2xl font-bold leading-tight text-text-primary break-words font-google pt-0.5 hover:text-google-blue transition-colors duration-300"
              >
                {{ event().title }}
              </h3>

              <!-- Descripción -->
              @if (event().description) {
                <p class="text-sm text-text-secondary line-clamp-2">
                  {{ event().description }}
                </p>
              }

              <!-- Dirección Breve -->
              @if (event().location_name) {
                <div class="flex items-center gap-1 text-xs text-text-secondary min-w-0">
                  <span class="material-symbols-rounded text-sm text-text-muted" aria-hidden="true"
                    >location_on</span
                  >
                  <span class="min-w-0 break-words font-medium">{{ event().location_name }}</span>
                </div>
              }
            </div>

            <!-- Botón de Registro alineado a la derecha en Desktop -->
            <div class="sm:self-end sm:w-56 w-full">
              <button
                mat-flat-button
                type="button"
                class="gdg-btn-filled w-full"
                [routerLink]="['/e', event().slug]"
              >
                Registrarse
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  `,
})
export class EventCard {
  readonly event = input.required<Event>();

  readonly dateLabel = computed(() =>
    new Intl.DateTimeFormat('es-BO', {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
    }).format(this.event().date_start),
  );

  readonly locationText = computed(() => {
    const type = this.event().location_type;
    if (type === 'VIRTUAL') return 'Virtual';
    if (type === 'HYBRID') return 'Híbrido';
    return 'Presencial';
  });

  readonly locationIcon = computed(() => {
    const type = this.event().location_type;
    if (type === 'VIRTUAL') return 'videocam';
    if (type === 'HYBRID') return 'devices';
    return 'place';
  });

  readonly locationClassText = computed(() => {
    const type = this.event().location_type;
    if (type === 'VIRTUAL') return 'text-google-red';
    if (type === 'HYBRID') return 'text-google-yellow';
    return 'text-google-green';
  });
}
