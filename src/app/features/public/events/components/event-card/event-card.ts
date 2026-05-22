import { Component, input } from '@angular/core';
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
      class="gdg-card overflow-hidden transition-shadow duration-300 ease-in-out hover:shadow-md cursor-pointer"
      [routerLink]="['/e', event().slug]"
    >
      <div class="p-4">
        <div class="flex flex-col sm:flex-row gap-4">
          <div class="sm:w-72 shrink-0">
            @if (event().logo_url) {
              <img
                [src]="event().logo_url"
                [alt]="event().title"
                class="aspect-video w-full object-cover rounded-2xl"
              />
            } @else {
              <app-event-image-placeholder />
            }
          </div>

          <div class="flex flex-col justify-between gap-3 flex-1 min-w-0">
            <div class="space-y-2 min-w-0">
              <div class="flex items-center gap-1.5 text-google-blue text-sm font-medium">
                <span class="material-symbols-rounded text-base" aria-hidden="true">calendar_month</span>
                <span>{{ dateLabel() }}</span>
              </div>

            <h3 class="text-2xl font-bold leading-tight text-text-primary break-words">
              {{ event().title }}
            </h3>

              @if (event().description) {
                <p class="text-sm text-text-secondary line-clamp-2">
                  {{ event().description }}
                </p>
              }

              <div class="flex items-center gap-1 text-xs text-text-secondary min-w-0">
                <span class="material-symbols-rounded text-sm" aria-hidden="true">location_on</span>
                <span class="min-w-0 break-words">{{ locationLabel() }}</span>
              </div>
            </div>

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

  readonly dateLabel = () =>
    new Intl.DateTimeFormat('es-BO', {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
    }).format(this.event().date_start);

  readonly locationLabel = () => {
    const e = this.event();
    if (e.location_name) return e.location_name;
    if (e.location_type === 'VIRTUAL') return 'Virtual';
    if (e.location_type === 'HYBRID') return 'Híbrido';
    return 'Presencial';
  };
}
