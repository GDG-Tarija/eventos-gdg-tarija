import { Component, inject } from '@angular/core';
import { PublicEventsService } from '../events/data/public-events.service';
import { EventCard } from '../events/components/event-card/event-card';
import { EventCardSkeleton } from '../events/components/event-card-skeleton/event-card-skeleton';

@Component({
  selector: 'app-home',
  imports: [EventCard, EventCardSkeleton],
  template: `
    <section class="gdg-page">
      <div class="gdg-container space-y-8">
        <h1 class="gdg-h1">Próximos Eventos</h1>

        @if (eventsService.isEventLoading()) {
          <div class="space-y-6">
            @for (_ of [1,2,3]; track $index) {
              <app-event-card-skeleton />
            }
          </div>
        } @else if (eventsService.events().length === 0) {
          <div class="text-center py-20">
            <span class="material-symbols-rounded text-5xl text-text-muted" aria-hidden="true">event_busy</span>
            <p class="mt-4 text-lg text-text-secondary">No hay eventos próximos por ahora.</p>
          </div>
        } @else {
          <div class="space-y-6">
            @for (event of eventsService.events(); track event.id) {
              <app-event-card [event]="event" />
            }
          </div>
        }
      </div>

      <footer class="mt-20 py-10 border-t border-black/5">
        <div class="flex justify-center gap-6 text-text-muted">
          <span class="material-symbols-rounded text-2xl" aria-label="GitHub">globe</span>
          <span class="material-symbols-rounded text-2xl" aria-label="YouTube">play_circle</span>
          <span class="material-symbols-rounded text-2xl" aria-label="X">X</span>
          <span class="material-symbols-rounded text-2xl" aria-label="Instagram">photo_camera</span>
        </div>
        <p class="mt-4 text-center text-sm text-text-muted">
          Plataforma hecha en casa por GDG Tarija
        </p>
      </footer>
    </section>
  `,
})
export class Home {
  readonly eventsService = inject(PublicEventsService);
}
