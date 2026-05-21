import { AfterViewInit, Component, inject } from '@angular/core';
import { PublicEventsService } from '../events/data/public-events.service';
import { EventCard } from '../events/components/event-card/event-card';
import { EventCardSkeleton } from '../events/components/event-card-skeleton/event-card-skeleton';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-home',
  imports: [EventCard, EventCardSkeleton],
  template: `
    <section class="gdg-page">
      <div class="gdg-container space-y-8">
        <h1 class="gdg-h1">Próximos Eventos</h1>

        @if (eventsService.isEventLoading()) {
          <div class="flex flex-col gap-6">
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
          <div class="flex flex-col gap-6">
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
export class Home implements AfterViewInit {
  readonly eventsService = inject(PublicEventsService);

  ngAfterViewInit(): void {
    if (environment.production) return;

    // Debug helper: detect horizontal overflow offenders in layout.
    setTimeout(() => {
      const vw = document.documentElement.clientWidth;
      const sw = document.documentElement.scrollWidth;

      if (sw <= vw) return;

      const offenders: Array<{ el: Element; right: number; width: number }> = [];
      for (const el of Array.from(document.querySelectorAll('body *'))) {
        const r = (el as HTMLElement).getBoundingClientRect();
        if (r.right > vw + 1 || r.width > vw + 1) offenders.push({ el, right: r.right, width: r.width });
      }
      offenders.sort((a, b) => b.right - a.right);

      // eslint-disable-next-line no-console
      console.warn('[UI] Horizontal overflow detected', { viewport: vw, scrollWidth: sw });
      // eslint-disable-next-line no-console
      console.table(
        offenders.slice(0, 15).map((o) => ({
          tag: o.el.tagName.toLowerCase(),
          class: (o.el as HTMLElement).className?.toString?.().slice(0, 120),
          right: Math.round(o.right),
          width: Math.round(o.width),
        })),
      );
    }, 0);
  }
}
