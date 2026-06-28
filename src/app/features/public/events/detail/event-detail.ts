import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl, Title, Meta } from '@angular/platform-browser';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PublicEventsService } from '../data/public-events.service';
import { Event } from '../data/event.model';
import { EventRegistrationCheckout } from '../registration/components/event-registration-checkout';
import { LOGOS } from '../../../../core/config/logos';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [RouterLink, MatProgressSpinnerModule, EventRegistrationCheckout],
  template: `
    <section class="gdg-page flex flex-col justify-between min-h-[calc(100vh-64px)] bg-transparent">
      <!-- Contenido Principal -->
      <div class="flex-grow w-full pb-16">
        <div class="gdg-container md:px-0">
          @if (loading()) {
            <!-- Skeleton de carga sin caja pesada -->
            <div class="space-y-8 animate-pulse pt-6">
              <div class="h-4 w-24 bg-black/5 rounded-full"></div>
              <div class="h-48 sm:h-64 md:h-80 bg-black/5 rounded-3xl"></div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div class="md:col-span-2 space-y-6">
                  <div class="h-10 w-3/4 bg-black/5 rounded-xl"></div>
                  <div class="space-y-3">
                    <div class="h-4 w-full bg-black/5 rounded"></div>
                    <div class="h-4 w-5/6 bg-black/5 rounded"></div>
                    <div class="h-4 w-4/6 bg-black/5 rounded"></div>
                  </div>
                </div>
                <div class="space-y-4">
                  <div class="h-64 bg-black/5 rounded-3xl"></div>
                </div>
              </div>
            </div>
          } @else if (!event()) {
            <!-- Estado vacío sin caja pesada -->
            <div class="p-10 sm:p-14 max-w-3xl mx-auto text-center space-y-4 mt-12">
              <span
                class="material-symbols-rounded text-6xl text-text-muted/60 animate-bounce block"
                aria-hidden="true"
                >event_busy</span
              >
              <h1 class="text-2xl font-bold text-text-primary">Evento no encontrado</h1>
              <p class="text-text-secondary">
                No existe un evento publicado con el identificador <strong>{{ slug }}</strong>
              </p>
              <a
                routerLink="/"
                class="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full bg-google-blue text-white text-sm font-bold hover:bg-blue-600 transition-colors duration-200"
              >
                <span class="material-symbols-rounded text-base" aria-hidden="true"
                  >arrow_back</span
                >
                Ver todos los eventos
              </a>
            </div>
          } @else {
            <div class="space-y-8 pt-6">
              <!-- Hero del Evento: Banner elegante con bordes premium rounded-3xl sin card pesado -->
              <div
                class="relative h-24 sm:h-48 lg:h-72 bg-black/5 rounded-xl md:rounded-3xl overflow-hidden shadow-sm shrink-0"
              >
                @if (event()!.banner_url) {
                  <img
                    class="absolute inset-0 w-full h-full object-cover"
                    [src]="event()!.banner_url"
                    [alt]="event()!.title"
                  />
                } @else {
                  <!-- Banner por defecto oficial provisto por el usuario -->
                  <img
                    class="absolute inset-0 w-full h-full object-cover"
                    src="https://res.cloudinary.com/dopkch3x9/image/upload/v1779579233/GDG_Bevy_DefaultEventBanner_VKOwYjb_c913np.webp"
                    [alt]="event()!.title"
                  />
                }
                <!-- Degradado sutil suavizado para un look limpio y premium -->
                <div class="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>

                <!-- Botón de ir atrás flotante en el banner, super minimalista y elegante (estilo Airbnb/Viajes) -->
                <a
                  [routerLink]="['/']"
                  class="hidden sm:flex absolute top-4 left-4 w-9 h-9 rounded-full bg-white/90 hover:bg-white backdrop-blur-sm border border-black/5 text-text-primary hover:text-google-blue hover:scale-105 active:scale-95 transition-all duration-200 items-center justify-center shadow-md group cursor-pointer no-underline"
                  aria-label="Volver a eventos"
                  title="Volver a eventos"
                >
                  <span
                    class="material-symbols-rounded text-lg group-hover:-translate-x-0.5 transition-transform duration-200 no-underline"
                    aria-hidden="true"
                    >arrow_back</span
                  >
                </a>
              </div>

              <!-- Layout de Dos Columnas: Principal (Izquierda, 2/3) y Lateral (Derecha, 1/3) -->
              <div class="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
                <!-- Columna Principal: Descripción, Ubicación, etc. -->
                <div class="md:col-span-3 space-y-8">
                  <!-- Cabecera de información rápida (sin icono redundante) -->
                  <div class="space-y-4">
                    <div class="min-w-0 flex-1 space-y-2">
                      <!-- Fecha superior -->
                      <div class="flex items-center gap-2 text-google-blue text-sm font-semibold">
                        <span class="material-symbols-rounded text-base" aria-hidden="true"
                          >calendar_month</span
                        >
                        <span>{{ startDateLabel() }}</span>
                        @if (endDateLabel()) {
                          <span class="text-text-muted font-normal">—</span>
                          <span>{{ endDateLabel() }}</span>
                        }
                      </div>

                      <!-- Título del Evento -->
                      <h1
                        class="text-2xl sm:text-4xl font-extrabold tracking-tight text-text-primary leading-tight font-google break-words"
                      >
                        {{ event()!.title }}
                      </h1>

                      <!-- Badges Compactos -->
                      <div class="flex flex-wrap gap-2 text-sm pt-1">
                        <span
                          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold {{
                            typeBadgeClass()
                          }}"
                        >
                          <span class="material-symbols-rounded text-base" aria-hidden="true"
                            >category</span
                          >
                          <span>{{ typeLabel() }}</span>
                        </span>

                        <span
                          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold {{
                            modalityBadgeClass()
                          }}"
                        >
                          <span class="material-symbols-rounded text-base" aria-hidden="true"
                            >place</span
                          >
                          <span>{{ locationText() }}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Descripción con funcionalidad "Ver más" a partir de la línea 5 -->
                  @if (event()!.description) {
                    <div class="space-y-3">
                      <h2
                        class="text-lg font-bold text-text-primary flex items-center gap-2 font-google"
                      >
                        <span
                          class="material-symbols-rounded text-lg text-google-blue"
                          aria-hidden="true"
                          >info</span
                        >
                        Sobre el evento
                      </h2>
                      <div class="relative">
                        <p
                          class="text-text-secondary leading-relaxed whitespace-pre-line text-sm sm:text-base"
                          [class.line-clamp-5]="isDescriptionLong() && !showFullDescription()"
                        >
                          {{ event()!.description }}
                        </p>

                        @if (isDescriptionLong()) {
                          <button
                            type="button"
                            (click)="showFullDescription.set(!showFullDescription())"
                            class="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-google-blue hover:text-blue-600 underline transition-colors duration-200 focus:outline-none cursor-pointer border-0 bg-transparent p-0"
                          >
                            <span>{{ showFullDescription() ? 'Ver menos' : 'Ver más' }}</span>
                            <span class="material-symbols-rounded text-sm" aria-hidden="true">
                              {{
                                showFullDescription() ? 'keyboard_arrow_up' : 'keyboard_arrow_down'
                              }}
                            </span>
                          </button>
                        }
                      </div>
                    </div>
                  }

                  <!-- Ubicación / Google Maps (Directamente el mapa con tarjeta superpuesta, sin textos redundantes) -->
                  @if (mapsEmbedUrl() && event()!.location_type !== 'VIRTUAL') {
                    <div class="space-y-3 pt-2">
                      <!-- Mapa embebido redondeado con la tarjeta flotante superpuesta (estilo Airbnb/Premium) -->
                      <div
                        class="rounded-3xl overflow-hidden border border-black/5 shadow-sm h-64 sm:h-80 relative bg-black/[0.02]"
                      >
                        <iframe
                          [src]="mapsEmbedUrl()!"
                          width="100%"
                          height="100%"
                          style="border: 0;"
                          allowfullscreen
                          loading="lazy"
                          referrerpolicy="no-referrer-when-downgrade"
                          title="Ubicación del evento en Google Maps"
                          aria-label="Mapa de ubicación del evento"
                        ></iframe>
                      </div>

                      @if (event()!.address_link) {
                        <a
                          [href]="event()!.address_link"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="inline-flex items-center gap-1.5 text-xs font-semibold text-google-blue hover:underline transition-all duration-200"
                        >
                          <span class="material-symbols-rounded text-sm" aria-hidden="true"
                            >open_in_new</span
                          >
                          Abrir en Google Maps
                        </a>
                      }
                    </div>
                  }
                </div>

                <!-- Columna Lateral Sticky: Registro e Información de Cupos (Rediseñada y más compacta) -->
                <div class="md:col-span-2 space-y-4 md:sticky md:top-24">
                  <div
                    class="gdg-card border border-black/5 shadow-google-card p-4 sm:p-5 space-y-4"
                  >
                    <div class="space-y-1">
                      <h3 class="text-base font-bold text-text-primary m-0 py-2 leading-tight">
                        REGISTRO DE ASISTENCIA
                      </h3>

                      <!-- Estado de cupos -->
                      @if (isPast()) {
                        <div
                          class="inline-flex items-center gap-1.5 rounded-full bg-black/5 text-text-muted px-3 py-1 text-xs font-semibold"
                        >
                          <span class="material-symbols-rounded text-base" aria-hidden="true"
                            >event_busy</span
                          >
                          <span>Evento finalizado</span>
                        </div>
                      } @else if (event()!.available_spots !== undefined) {
                        @if (event()!.is_full) {
                          <div
                            class="inline-flex items-center gap-1.5 rounded-full bg-google-red/10 text-google-red px-3 py-1 text-xs font-semibold"
                          >
                            <span class="material-symbols-rounded text-base" aria-hidden="true"
                              >block</span
                            >
                            <span>Entradas agotadas</span>
                          </div>
                        } @else if (event()!.available_spots! <= 10) {
                          <div
                            class="inline-flex items-center gap-1.5 rounded-full bg-google-red/10 text-google-red px-3 py-1 text-xs font-semibold animate-pulse"
                          >
                            <span class="material-symbols-rounded text-base" aria-hidden="true"
                              >warning</span
                            >
                            <span>¡Solo quedan {{ event()!.available_spots }} lugares!</span>
                          </div>
                        } @else {
                          <div
                            class="inline-flex items-center gap-1.5 rounded-full bg-google-green/10 text-google-green px-3 py-1 text-xs font-semibold"
                          >
                            <span class="material-symbols-rounded text-base" aria-hidden="true"
                              >confirmation_number</span
                            >
                            <span>{{ event()!.available_spots }} disponibles</span>
                          </div>
                        }
                      }
                    </div>

                    <div class="border-t border-black/5">
                      <!-- Checkout Form -->
                      <app-event-registration-checkout [event]="event()!" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class EventDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly events = inject(PublicEventsService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);

  readonly loading = signal(true);
  readonly event = signal<Event | null>(null);

  readonly logoIcon = LOGOS.icon;

  // Estado para la visualización del texto extendido
  readonly showFullDescription = signal(false);

  // Computa si el evento ya finalizó
  readonly isPast = computed(() => {
    const e = this.event();
    if (!e) return false;
    const now = new Date();
    const endDate = e.date_end ?? e.date_start;
    return now > endDate;
  });

  // Computa si la descripción del evento es extensa (más de 300 caracteres o 5 líneas)
  readonly isDescriptionLong = computed(() => {
    const desc = this.event()?.description;
    if (!desc) return false;
    return desc.length > 300 || desc.split('\n').length > 5;
  });

  readonly startDateLabel = computed(() => {
    const e = this.event();
    return e ? this.dateLabelFormat(e.date_start) : '';
  });

  readonly endDateLabel = computed(() => {
    const e = this.event();
    return e && e.date_end ? this.dateLabelFormat(e.date_end) : '';
  });

  readonly locationText = computed(() => {
    const e = this.event();
    if (!e) return '';
    if (e.location_name) return e.location_name;
    if (e.location_type === 'VIRTUAL') return 'Virtual';
    if (e.location_type === 'HYBRID') return 'Híbrido';
    return 'Presencial';
  });

  /** Convierte el link de Google Maps compartido o el nombre de la ubicación en URL embebible universal y robusta */
  readonly mapsEmbedUrl = computed((): SafeResourceUrl | null => {
    const ev = this.event();
    if (!ev || ev.location_type === 'VIRTUAL') return null;

    const link = ev.address_link;
    const name = ev.location_name;

    // Caso 1: Ya es un link de embed provisto explícitamente
    if (link && link.includes('maps/embed')) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(link);
    }

    // Caso 2: Si el link tiene parámetros de consulta directos como q o query
    if (link) {
      try {
        const url = new URL(link);
        const q = url.searchParams.get('q') ?? url.searchParams.get('query');
        if (q) {
          const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
          return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
        }
      } catch {
        // No es una URL válida directamente
      }
    }

    // Caso 3: Usar el nombre de la ubicación física (solución universal y super robusta que previene bloqueos de X-Frame-Options en links acortados)
    if (name) {
      const queryText = name.toLowerCase().includes('tarija') ? name : `${name}, Tarija`;
      const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(queryText)}&output=embed`;
      return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
    }

    // Caso 4: Fallback con el link directo si no es acortado
    if (link && !link.includes('maps.app.goo.gl') && !link.includes('goo.gl/maps')) {
      const fallback = link.replace('https://www.google.com/maps', 'https://maps.google.com/maps');
      const delimiter = fallback.includes('?') ? '&' : '?';
      return this.sanitizer.bypassSecurityTrustResourceUrl(`${fallback}${delimiter}output=embed`);
    }

    return null;
  });

  /** Badge de color de marca para el tipo de evento */
  readonly typeBadgeClass = computed((): string => {
    const type = this.event()?.event_type;
    switch (type) {
      case 'MEETUP':
        return 'bg-google-blue/10 text-google-blue';
      case 'CONFERENCE':
        return 'bg-google-red/10 text-google-red';
      case 'WORKSHOP':
        return 'bg-google-yellow/10 text-google-yellow';
      case 'HACKATHON':
        return 'bg-google-green/10 text-google-green';
      default:
        return 'bg-black/5 text-text-secondary';
    }
  });

  /** Etiqueta legible del tipo de evento */
  readonly typeLabel = computed((): string => {
    const type = this.event()?.event_type;
    switch (type) {
      case 'MEETUP':
        return 'Meetup';
      case 'CONFERENCE':
        return 'Conferencia';
      case 'WORKSHOP':
        return 'Taller';
      case 'HACKATHON':
        return 'Hackathon';
      default:
        return type ?? '';
    }
  });

  /** Badge de color de marca para la modalidad */
  readonly modalityBadgeClass = computed((): string => {
    const type = this.event()?.location_type;
    switch (type) {
      case 'PHYSICAL':
        return 'bg-google-green/10 text-google-green';
      case 'VIRTUAL':
        return 'bg-google-red/10 text-google-red';
      case 'HYBRID':
        return 'bg-google-yellow/10 text-google-yellow';
      default:
        return 'bg-black/5 text-text-secondary';
    }
  });

  get slug(): string {
    return this.route.snapshot.paramMap.get('slug') ?? '';
  }

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    const eventData = await this.events.getBySlug(this.slug);
    this.event.set(eventData);
    this.loading.set(false);

    if (eventData) {
      this.updateSeoTags(eventData);
    }
  }

  private updateSeoTags(event: Event): void {
    const pageTitle = `${event.title} | GDG Tarija`;
    this.titleService.setTitle(pageTitle);

    const desc = event.description 
      ? event.description.substring(0, 160).trim() + '...'
      : 'Únete a este increíble evento de tecnología organizado por la comunidad de Google Developer Groups Tarija. ¡Regístrate gratis ahora!';
    
    const banner = event.banner_url || 'https://res.cloudinary.com/dopkch3x9/image/upload/v1779579233/GDG_Bevy_DefaultEventBanner_VKOwYjb_c913np.webp';
    const pageUrl = `https://eventos.gdgtarija.com/e/${event.slug}`;

    // Standard SEO Tags
    this.metaService.updateTag({ name: 'description', content: desc });

    // Open Graph (Facebook, WhatsApp, Slack, LinkedIn)
    this.metaService.updateTag({ property: 'og:title', content: pageTitle });
    this.metaService.updateTag({ property: 'og:description', content: desc });
    this.metaService.updateTag({ property: 'og:image', content: banner });
    this.metaService.updateTag({ property: 'og:url', content: pageUrl });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });

    // Twitter Card
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: pageTitle });
    this.metaService.updateTag({ name: 'twitter:description', content: desc });
    this.metaService.updateTag({ name: 'twitter:image', content: banner });
  }

  private dateLabelFormat(date: Date): string {
    return new Intl.DateTimeFormat('es-BO', {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
    }).format(date);
  }
}
