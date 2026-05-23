import { AfterViewInit, Component, computed, inject, signal } from '@angular/core';
import { PublicEventsService } from '../events/data/public-events.service';
import { EventCard } from '../events/components/event-card/event-card';
import { EventCardSkeleton } from '../events/components/event-card-skeleton/event-card-skeleton';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-home',
  imports: [EventCard, EventCardSkeleton],
  template: `
    <section class="gdg-page">
      <div class="gdg-container space-y-12">
        <!-- Hero Section -->
        <div class="hero-section text-center sm:text-left space-y-4 max-w-4xl">
          <h1
            class="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-text-primary leading-tight font-google"
          >
            Espacio de aprendizaje <br class="hidden sm:inline" />
            y conexión en tecnología
          </h1>
          <p class="text-base sm:text-lg md:text-xl text-text-secondary max-w-2xl">
            Únete a talleres, conferencias y hackathones de nivel internacional organizados de forma
            abierta y gratuita por la comunidad para potenciar tu carrera.
          </p>
        </div>

        <!-- Filtros de Categorías -->
        <div class="space-y-2">
          <div
            class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0"
          >
            @for (cat of categoryOptions; track cat.value) {
              <button
                type="button"
                class="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 whitespace-nowrap active:scale-[0.97]"
                [class.bg-google-blue]="selectedType() === cat.value"
                [class.text-white]="selectedType() === cat.value"
                [class.shadow-sm]="selectedType() === cat.value"
                [class.bg-black/5]="selectedType() !== cat.value"
                [class.text-text-secondary]="selectedType() !== cat.value"
                [class.hover:bg-black/10]="selectedType() !== cat.value"
                (click)="selectedType.set(cat.value)"
              >
                {{ cat.label }}
              </button>
            }
          </div>
        </div>

        <!-- Contenido / Eventos -->
        <div class="space-y-6">
          <h2 class="text-2xl font-bold text-text-primary font-google">Eventos disponibles</h2>

          @if (eventsService.isEventLoading()) {
            <div class="flex flex-col gap-6">
              @for (_ of [1, 2, 3]; track $index) {
                <app-event-card-skeleton />
              }
            </div>
          } @else if (filteredEvents().length === 0) {
            <div class="gdg-card p-10 sm:p-16 text-center">
              <span
                class="material-symbols-rounded text-6xl text-text-muted/60 animate-bounce"
                aria-hidden="true"
                >event_busy</span
              >
              <p class="mt-4 text-lg font-medium text-text-primary">No se encontraron eventos</p>
              <p class="text-sm text-text-secondary mt-1">
                Prueba seleccionando otra categoría o regresa más tarde.
              </p>
            </div>
          } @else {
            <div class="flex flex-col gap-6">
              @for (event of filteredEvents(); track event.id) {
                <app-event-card [event]="event" />
              }
            </div>
          }
        </div>
      </div>

      <!-- Footer Flotante centrado -->
      <footer class="mt-24 py-12 border-t border-black/5">
        <div class="flex justify-center gap-4 text-text-secondary">
          <a
            href="#"
            class="p-3 rounded-full hover:bg-black/5 hover:text-google-blue transition-colors duration-300"
            aria-label="Github"
          >
            <span class="material-symbols-rounded text-2xl" aria-hidden="true">globe</span>
          </a>
          <a
            href="#"
            class="p-3 rounded-full hover:bg-black/5 hover:text-google-red transition-colors duration-300"
            aria-label="YouTube"
          >
            <span class="material-symbols-rounded text-2xl" aria-hidden="true">play_circle</span>
          </a>
          <a
            href="#"
            class="p-3 rounded-full hover:bg-black/5 hover:text-text-primary transition-colors duration-300"
            aria-label="X (Twitter)"
          >
            <span class="material-symbols-rounded text-2xl" aria-hidden="true">close</span>
          </a>
          <a
            href="#"
            class="p-3 rounded-full hover:bg-black/5 hover:text-google-green transition-colors duration-300"
            aria-label="Instagram"
          >
            <span class="material-symbols-rounded text-2xl" aria-hidden="true">photo_camera</span>
          </a>
        </div>
        <p class="mt-4 text-center text-sm font-medium text-text-secondary">
          Plataforma hecha en casa por GDG Tarija
        </p>
      </footer>
    </section>
  `,
})
export class Home implements AfterViewInit {
  readonly eventsService = inject(PublicEventsService);

  readonly selectedType = signal<string>('ALL');

  readonly categoryOptions = [
    { value: 'ALL', label: 'Todos los eventos' },
    { value: 'MEETUP', label: 'Meetups' },
    { value: 'CONFERENCE', label: 'Conferencias' },
    { value: 'WORKSHOP', label: 'Talleres' },
    { value: 'HACKATHON', label: 'Hackathones' },
  ];

  readonly filteredEvents = computed(() => {
    const type = this.selectedType();
    const list = this.eventsService.events();
    if (type === 'ALL') return list;
    return list.filter((e) => e.event_type === type);
  });

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
        if (r.right > vw + 1 || r.width > vw + 1)
          offenders.push({ el, right: r.right, width: r.width });
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
