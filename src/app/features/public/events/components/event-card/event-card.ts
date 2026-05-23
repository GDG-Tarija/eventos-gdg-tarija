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
      class="gdg-card border border-black/5 overflow-hidden transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-sm cursor-pointer sm:h-[230px]"
      [routerLink]="['/e', event().slug]"
    >
      <div class="p-3 sm:p-5 h-full">
        <div class="flex flex-col sm:flex-row gap-4 sm:gap-6 h-full sm:items-center">
          <!-- Image Section with hover micro-zoom -->
          <div
            class="w-full aspect-square max-w-[280px] sm:w-auto sm:h-full shrink-0 overflow-hidden rounded-full relative group-card-img bg-black/5 mx-auto sm:mx-0 flex items-center justify-center"
          >
            @if (event().logo_url) {
              <img
                [src]="event().logo_url"
                [alt]="event().title"
                class="w-full h-full object-cover rounded-full transition-transform duration-500 ease-in-out group-hover:scale-105"
              />
            } @else {
              <img
                src="https://res.cloudinary.com/dopkch3x9/image/upload/v1779579233/GDG_Bevy_DefaultEventThumbnail_2_vaeskpB_pggj5h.webp"
                [alt]="event().title"
                class="w-full h-full object-cover rounded-full transition-transform duration-500 ease-in-out group-hover:scale-105"
              />
            }
          </div>

          <!-- Content Section -->
          <div class="flex flex-col justify-between gap-2.5 flex-1 min-w-0 h-full">
            <!-- Bloque Superior: Título, Metadata y Descripción -->
            <div class="space-y-2 min-w-0">
              <!-- Título del Evento sin padding ni margen vertical -->
              <h3
                class="text-xl sm:text-2xl font-bold leading-tight text-text-primary break-words font-google hover:text-google-blue transition-colors duration-300 m-0 p-0"
              >
                {{ event().title }}
              </h3>

              <!-- Metadata Row con Chips Premium -->
              <div class="flex flex-wrap items-center gap-2 text-xs">
                <!-- Fecha -->
                <div
                  class="flex items-center gap-1.5 text-google-blue bg-google-blue/5 px-2.5 py-1 rounded-full font-semibold shrink-0"
                >
                  <span class="material-symbols-rounded text-sm" aria-hidden="true"
                    >calendar_month</span
                  >
                  <span>{{ dateLabel() }}</span>
                </div>

                <!-- Modalidad Virtual (solo si aplica) -->
                @if (event().location_type === 'VIRTUAL') {
                  <div
                    class="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold bg-google-red/10 text-google-red shrink-0"
                  >
                    <span class="material-symbols-rounded text-sm" aria-hidden="true"
                      >videocam</span
                    >
                    <span>Virtual</span>
                  </div>
                }

                <!-- Dirección Breve como Tag -->
                @if (event().location_name) {
                  <div
                    class="flex items-center gap-1.5 bg-black/5 px-2.5 py-1 rounded-full font-medium text-text-secondary min-w-0"
                  >
                    <span
                      class="material-symbols-rounded text-sm text-text-muted shrink-0"
                      aria-hidden="true"
                      >location_on</span
                    >
                    <span class="truncate max-w-[200px]">{{ event().location_name }}</span>
                  </div>
                }

                <!-- Capacidad de Asistentes -->
                <div
                  class="flex items-center gap-1.5 bg-black/5 px-2.5 py-1 rounded-full font-medium text-text-secondary shrink-0"
                >
                  <span
                    class="material-symbols-rounded text-sm text-text-muted shrink-0"
                    aria-hidden="true"
                    >group</span
                  >
                  <span>{{ event().capacity }} asistentes</span>
                </div>
              </div>

              <!-- Descripción -->
              @if (event().description) {
                <p class="text-xs sm:text-sm text-text-secondary line-clamp-2 leading-relaxed">
                  {{ event().description }}
                </p>
              }
            </div>

            <!-- Bloque Inferior: Barra de Estado y Acción -->
            <div
              class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full border-t border-black/5 pt-2.5 mt-0.5 shrink-0"
            >
              <!-- Alertas de Cupo -->
              <div class="flex items-center gap-3 text-xs font-semibold text-text-secondary">
                @if (
                  event().available_spots !== undefined &&
                  event().available_spots! <= 10 &&
                  event().available_spots! > 0
                ) {
                  <div
                    class="flex items-center gap-1 text-google-red bg-google-red/5 px-2 py-0.5 rounded animate-pulse"
                  >
                    <span class="material-symbols-rounded text-sm" aria-hidden="true">alarm</span>
                    <span>¡Solo {{ event().available_spots }} cupos!</span>
                  </div>
                } @else if (event().available_spots === 0 || event().is_full) {
                  <div
                    class="flex items-center gap-1 text-text-muted bg-black/5 px-2 py-0.5 rounded"
                  >
                    <span class="material-symbols-rounded text-sm" aria-hidden="true">block</span>
                    <span>Agotado</span>
                  </div>
                }
              </div>

              <!-- Acción: Registrarse -->
              <div class="w-full sm:w-auto">
                <button
                  mat-flat-button
                  type="button"
                  class="gdg-btn-filled h-8 w-full sm:w-auto px-4 rounded-full text-xs font-bold transition-all duration-300 active:scale-95 hover:shadow-sm"
                  [routerLink]="['/e', event().slug]"
                >
                  <span class="flex items-center justify-center gap-1.5 w-full h-full leading-none">
                    <span>Registrarse</span>
                    <span class="material-symbols-rounded text-sm" aria-hidden="true"
                      >arrow_forward</span
                    >
                  </span>
                </button>
              </div>
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
