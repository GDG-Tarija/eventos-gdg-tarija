import { AfterViewInit, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicEventsService } from '../events/data/public-events.service';
import { EventCard } from '../events/components/event-card/event-card';
import { EventCardSkeleton } from '../events/components/event-card-skeleton/event-card-skeleton';
import { environment } from '../../../../environments/environment';
import socialsData from '../../../core/config/socials.json';
import { LOGOS } from '../../../core/config/logos';

@Component({
  selector: 'app-home',
  imports: [EventCard, EventCardSkeleton, RouterLink],
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

      <!-- Footer -->
      <footer class="mt-12 py-4 border-t border-color-border bg-transparent">
        <div class="gdg-container flex flex-col md:flex-row items-center justify-between gap-4">
          <!-- Lado Izquierdo: Logo y Copyright -->
          <div class="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <img [src]="logoIcon.src" [alt]="logoIcon.alt" class="h-5 w-auto" />
            <span class="hidden sm:inline text-text-secondary/20">|</span>
            <p class="text-xs font-semibold text-text-secondary m-0">
              Plataforma hecha por cumpitas y cumitas tech
            </p>
          </div>

          <!-- Lado Derecho: Links y Redes -->
          <div class="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <!-- Enlaces Requeridos -->
            <div class="flex items-center gap-3 text-xs font-bold text-text-secondary">
              <a
                href="https://gdgtarija.com/code-of-conduct/"
                target="_blank"
                rel="noopener noreferrer"
                class="hover:text-google-blue transition-colors duration-200 text-decoration-none"
              >
                Código de conducta
              </a>
              <span class="text-text-secondary/20">•</span>
              <a
                href="https://gdgtarija.com/"
                target="_blank"
                rel="noopener noreferrer"
                class="hover:text-google-blue transition-colors duration-200 text-decoration-none"
              >
                Comunidad
              </a>
            </div>

            <!-- Redes Vectoriales GDG -->
            <div class="flex items-center gap-1">
              @for (social of socials; track social.name) {
                <a
                  [href]="social.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="p-1.5 rounded-full hover:bg-black/[0.03] text-text-secondary hover:text-google-blue transition-all duration-200 flex items-center justify-center hover:scale-105"
                  [aria-label]="social.name"
                >
                  @switch (social.name.toLowerCase()) {
                    @case ('linkedin') {
                      <svg
                        class="w-4 h-4 fill-current"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
                        />
                      </svg>
                    }
                    @case ('instagram') {
                      <svg
                        class="w-4 h-4 fill-current"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051C.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"
                        />
                      </svg>
                    }
                    @case ('facebook') {
                      <svg
                        class="w-4 h-4 fill-current"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                        />
                      </svg>
                    }
                    @case ('youtube') {
                      <svg
                        class="w-4 h-4 fill-current"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.507 9.388.507 9.388.507s7.517 0 9.388-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
                        />
                      </svg>
                    }
                    @default {
                      <span class="material-symbols-rounded text-base" aria-hidden="true"
                        >link</span
                      >
                    }
                  }
                </a>
              }
            </div>
          </div>
        </div>
      </footer>
    </section>
  `,
})
export class Home implements AfterViewInit {
  readonly eventsService = inject(PublicEventsService);

  readonly logoHorizontal = LOGOS.horizontal;
  readonly logoIcon = LOGOS.icon;

  readonly socials = socialsData;

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
