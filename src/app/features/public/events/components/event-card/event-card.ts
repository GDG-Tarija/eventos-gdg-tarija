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
            @if (event().imageUrl) {
              <img
                [src]="event().imageUrl"
                [alt]="event().title"
                class="aspect-video sm:aspect-auto sm:h-full w-full object-cover rounded-2xl"
              />
            } @else {
              <app-event-image-placeholder />
            }
          </div>

          <div class="flex flex-col justify-between gap-3 flex-1 min-w-0">
            <div class="space-y-2">
              <div class="flex items-center gap-1.5 text-google-blue text-sm font-medium">
                <span class="material-symbols-rounded text-base" aria-hidden="true">calendar_month</span>
                <span>{{ event().date }}</span>
              </div>

              <h3 class="text-2xl font-bold leading-tight text-text-primary">
                {{ event().title }}
              </h3>

              <p class="text-sm text-text-secondary line-clamp-2">
                {{ event().description }}
              </p>

              <div class="flex items-center gap-1 text-xs text-text-secondary">
                <span class="material-symbols-rounded text-sm" aria-hidden="true">location_on</span>
                <span>{{ event().location }}</span>
              </div>
            </div>

            <div class="sm:self-end sm:w-56 w-full">
              <button mat-flat-button type="button" class="gdg-btn-filled w-full" (click)="$event.stopPropagation()">
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
}
