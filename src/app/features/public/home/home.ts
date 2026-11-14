import { AfterViewInit, Component, computed, inject, signal } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { PublicEventsService } from '../events/data/public-events.service';
import { splitEvents } from '../events/data/event-timing';
import { EventCard } from '../events/components/event-card/event-card';
import { EventCardSkeleton } from '../events/components/event-card-skeleton/event-card-skeleton';
import { LOGOS } from '../../../core/config/logos';
import { environment } from '../../../../environments/environment';

const CATEGORY_LABELS: Record<string, string> = {
  MEETUP: 'Meetups',
  CONFERENCE: 'Conferencias',
  WORKSHOP: 'Talleres',
  HACKATHON: 'Hackatones',
};
const PAST_PREVIEW = 3;

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
            Talleres, meetups, conferencias y hackatones organizados por la comunidad GDG Tarija
            para potenciar tu carrera.
          </p>
        </div>

        <!-- Próximos -->
        <div class="space-y-6">
          <div class="space-y-3">
            <h2 class="text-2xl font-bold text-text-primary font-google">Próximos eventos</h2>
            @if (categoryOptions().length > 2) {
              <div
                class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0"
              >
                @for (cat of categoryOptions(); track cat.value) {
                  <button
                    type="button"
                    class="h-10 px-4 border-0 rounded-full text-sm font-semibold whitespace-nowrap transition-colors duration-150 motion-safe:active:scale-[0.97]"
                    [class.bg-google-blue-dark]="selectedType() === cat.value"
                    [class.text-white]="selectedType() === cat.value"
                    [class.bg-black/5]="selectedType() !== cat.value"
                    [class.text-text-secondary]="selectedType() !== cat.value"
                    [class.hover:bg-black/10]="selectedType() !== cat.value"
                    [attr.aria-pressed]="selectedType() === cat.value"
                    (click)="selectedType.set(cat.value)"
                  >
                    {{ cat.label }}
                  </button>
                }
              </div>
            }
          </div>

          @if (eventsService.isEventLoading()) {
            <div class="flex flex-col gap-6" aria-busy="true">
              <span class="sr-only">Cargando eventos</span>
              @for (_ of [1, 2, 3]; track $index) {
                <app-event-card-skeleton />
              }
            </div>
          } @else if (eventsService.error()) {
            <div class="gdg-card p-10 sm:p-16 text-center">
              <p class="text-lg font-medium text-text-primary">No pudimos cargar los eventos</p>
              <p class="text-sm text-text-secondary mt-1">
                Revisa tu conexión e inténtalo de nuevo.
              </p>
              <button
                type="button"
                class="gdg-btn-outlined mt-4"
                (click)="eventsService.listPublished()"
              >
                Reintentar
              </button>
            </div>
          } @else if (upcoming().length > 0) {
            <ul role="list" class="flex flex-col gap-6 m-0 p-0 list-none">
              @for (event of upcoming(); track event.id) {
                <li><app-event-card [event]="event" /></li>
              }
            </ul>
          } @else if (selectedType() !== 'ALL' && allUpcoming().length > 0) {
            <div class="gdg-card p-10 sm:p-16 text-center">
              <p class="text-lg font-medium text-text-primary">
                No hay eventos de esta categoría por ahora
              </p>
              <button type="button" class="gdg-btn-outlined mt-4" (click)="selectedType.set('ALL')">
                Ver todos
              </button>
            </div>
          } @else {
            <div class="gdg-card p-10 sm:p-16 text-center">
              <p class="text-lg font-medium text-text-primary">No hay eventos próximos por ahora</p>
              <p class="text-sm text-text-secondary mt-1">
                Síguenos en redes para enterarte del próximo.
              </p>
            </div>
          }
        </div>

        <!-- Anteriores -->
        @if (!eventsService.isEventLoading() && past().length > 0) {
          <div class="space-y-6">
            <h2 class="text-2xl font-bold text-text-primary font-google">Eventos anteriores</h2>
            <ul role="list" class="grid gap-4 md:grid-cols-2 m-0 p-0 list-none">
              @for (event of visiblePast(); track event.id) {
                <li><app-event-card [event]="event" [compact]="true" /></li>
              }
            </ul>
            @if (past().length > PAST_PREVIEW) {
              <button
                type="button"
                class="gdg-btn-outlined"
                [attr.aria-expanded]="showAllPast()"
                (click)="showAllPast.set(!showAllPast())"
              >
                {{ showAllPast() ? 'Ver menos' : 'Ver anteriores (' + past().length + ')' }}
              </button>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class Home implements AfterViewInit {
  readonly eventsService = inject(PublicEventsService);
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);

  constructor() {
    this.titleService.setTitle('Inicio | GDG Tarija');
    this.metaService.updateTag({
      name: 'description',
      content: 'Espacio de aprendizaje y conexión en tecnología. Talleres, meetups, conferencias y hackatones organizados por la comunidad de Google Developer Groups Tarija.',
    });
    this.metaService.updateTag({ property: 'og:title', content: 'Inicio | GDG Tarija' });
    this.metaService.updateTag({ property: 'og:description', content: 'Espacio de aprendizaje y conexión en tecnología. Talleres, meetups, conferencias y hackatones organizados por la comunidad GDG Tarija.' });
    this.metaService.updateTag({ property: 'og:image', content: 'https://res.cloudinary.com/dopkch3x9/image/upload/v1779579233/GDG_Bevy_DefaultEventBanner_VKOwYjb_c913np.webp' });
    this.metaService.updateTag({ property: 'og:url', content: 'https://eventos.gdgtarija.com/' });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });

    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: 'Inicio | GDG Tarija' });
    this.metaService.updateTag({ name: 'twitter:description', content: 'Talleres, meetups, conferencias y hackatones organizados por la comunidad GDG Tarija.' });
    this.metaService.updateTag({ name: 'twitter:image', content: 'https://res.cloudinary.com/dopkch3x9/image/upload/v1779579233/GDG_Bevy_DefaultEventBanner_VKOwYjb_c913np.webp' });
  }

  readonly logoHorizontal = LOGOS.horizontal;
  readonly logoIcon = LOGOS.icon;
  readonly PAST_PREVIEW = PAST_PREVIEW;

  readonly selectedType = signal<string>('ALL');
  readonly showAllPast = signal(false);

  private readonly split = computed(() => splitEvents(this.eventsService.events()));
  readonly allUpcoming = computed(() => this.split().upcoming);

  // Only categories that have events, 'Todos' first.
  readonly categoryOptions = computed(() => {
    const present = new Set(this.eventsService.events().map((e) => e.event_type));
    return [
      { value: 'ALL', label: 'Todos' },
      ...Object.entries(CATEGORY_LABELS)
        .filter(([value]) => present.has(value as never))
        .map(([value, label]) => ({ value, label })),
    ];
  });

  private readonly byType = (type: string) => <T extends { event_type: string }>(list: T[]) =>
    type === 'ALL' ? list : list.filter((e) => e.event_type === type);

  readonly upcoming = computed(() => this.byType(this.selectedType())(this.split().upcoming));
  readonly past = computed(() => this.byType(this.selectedType())(this.split().past));
  readonly visiblePast = computed(() =>
    this.showAllPast() ? this.past() : this.past().slice(0, PAST_PREVIEW),
  );

  ngAfterViewInit(): void {
    if (environment.production) return;

    // Debug helper: detect horizontal overflow offenders in layout.
    setTimeout(() => {
      const vw = document.documentElement.clientWidth;
      const sw = document.documentElement.scrollWidth;

      if (sw <= vw) return;

      const offenders: { el: Element; right: number; width: number }[] = [];
      for (const el of Array.from(document.querySelectorAll('body *'))) {
        const r = (el as HTMLElement).getBoundingClientRect();
        if (r.right > vw + 1 || r.width > vw + 1)
          offenders.push({ el, right: r.right, width: r.width });
      }
      offenders.sort((a, b) => b.right - a.right);

       
       
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
