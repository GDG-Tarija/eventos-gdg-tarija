import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PublicEventsService } from '../data/public-events.service';
import { Event } from '../data/event.model';
import { EventRegistrationCheckout } from '../registration/components/event-registration-checkout';
import socialsData from '../../../../core/config/socials.json';
import { LOGOS } from '../../../../core/config/logos';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [RouterLink, MatProgressSpinnerModule, EventRegistrationCheckout],
  template: `
    <section class="gdg-page flex flex-col justify-between min-h-[calc(100vh-64px)] bg-transparent">
      
      <!-- Contenido Principal -->
      <div class="flex-grow w-full pb-16">
        <div class="gdg-container">
          
          @if (loading()) {
            <!-- Skeleton de carga sin caja pesada -->
            <div class="max-w-5xl mx-auto space-y-8 animate-pulse pt-6">
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
              <span class="material-symbols-rounded text-6xl text-text-muted/60 animate-bounce block" aria-hidden="true">event_busy</span>
              <h1 class="text-2xl font-bold text-text-primary">Evento no encontrado</h1>
              <p class="text-text-secondary">No existe un evento publicado con el identificador <strong>{{ slug }}</strong></p>
              <a routerLink="/" class="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full bg-google-blue text-white text-sm font-bold hover:bg-blue-600 transition-colors duration-200">
                <span class="material-symbols-rounded text-base" aria-hidden="true">arrow_back</span>
                Ver todos los eventos
              </a>
            </div>
          } @else {
            <div class="max-w-5xl mx-auto space-y-8 pt-6">

              <!-- Hero del Evento: Banner elegante con bordes premium rounded-3xl sin card pesado -->
              <div class="relative h-48 sm:h-64 md:h-80 bg-black/5 rounded-3xl overflow-hidden shadow-sm shrink-0">
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
                  class="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/90 hover:bg-white backdrop-blur-sm border border-black/5 text-text-primary hover:text-google-blue hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center shadow-md group cursor-pointer"
                  aria-label="Volver a eventos"
                  title="Volver a eventos"
                >
                  <span class="material-symbols-rounded text-lg group-hover:-translate-x-0.5 transition-transform duration-200" aria-hidden="true">arrow_back</span>
                </a>
              </div>

              <!-- Layout de Dos Columnas: Principal (Izquierda, 2/3) y Lateral (Derecha, 1/3) -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                
                <!-- Columna Principal: Descripción, Ubicación, etc. -->
                <div class="md:col-span-2 space-y-8">
                  
                  <!-- Cabecera de información rápida (sin icono redundante) -->
                  <div class="space-y-4">
                    <div class="min-w-0 flex-1 space-y-2">
                      <!-- Fecha superior -->
                      <div class="flex items-center gap-2 text-google-blue text-sm font-semibold">
                        <span class="material-symbols-rounded text-base" aria-hidden="true">calendar_month</span>
                        <span>{{ startDateLabel() }}</span>
                        @if (endDateLabel()) {
                          <span class="text-text-muted font-normal">—</span>
                          <span>{{ endDateLabel() }}</span>
                        }
                      </div>
                      
                      <!-- Título del Evento -->
                      <h1 class="text-2xl sm:text-4xl font-extrabold tracking-tight text-text-primary leading-tight font-google break-words">
                        {{ event()!.title }}
                      </h1>
                      
                      <!-- Badges Compactos -->
                      <div class="flex flex-wrap gap-2 text-sm pt-1">
                        <span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold {{ typeBadgeClass() }}">
                          <span class="material-symbols-rounded text-base" aria-hidden="true">category</span>
                          <span>{{ typeLabel() }}</span>
                        </span>
                        
                        <span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold {{ modalityBadgeClass() }}">
                          <span class="material-symbols-rounded text-base" aria-hidden="true">place</span>
                          <span>{{ locationText() }}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Descripción con funcionalidad "Ver más" a partir de la línea 5 -->
                  @if (event()!.description) {
                    <div class="space-y-3">
                      <h2 class="text-lg font-bold text-text-primary flex items-center gap-2 font-google">
                        <span class="material-symbols-rounded text-lg text-google-blue" aria-hidden="true">info</span>
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
                              {{ showFullDescription() ? 'keyboard_arrow_up' : 'keyboard_arrow_down' }}
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
                      <div class="rounded-3xl overflow-hidden border border-black/5 shadow-sm h-64 sm:h-80 relative bg-black/[0.02]">
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

                        <!-- Tarjeta de lugar superpuesta elegantemente -->
                        @if (event()!.location_name) {
                          <div class="absolute top-4 left-4 right-4 sm:right-auto bg-white/95 backdrop-blur-sm border border-black/5 rounded-2xl px-4 py-2.5 shadow-md max-w-sm flex items-center gap-2.5">
                            <span class="material-symbols-rounded text-google-blue text-lg" aria-hidden="true">place</span>
                            <div class="min-w-0">
                              <p class="text-[10px] font-bold text-text-muted uppercase tracking-wider m-0 leading-none">Lugar</p>
                              <p class="text-xs text-text-primary font-bold truncate mt-1 leading-tight">{{ event()!.location_name }}</p>
                            </div>
                          </div>
                        }
                      </div>
                      
                      @if (event()!.address_link) {
                        <a
                          [href]="event()!.address_link"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="inline-flex items-center gap-1.5 text-xs font-semibold text-google-blue hover:underline transition-all duration-200"
                        >
                          <span class="material-symbols-rounded text-sm" aria-hidden="true">open_in_new</span>
                          Abrir en Google Maps
                        </a>
                      }
                    </div>
                  }

                </div>

                <!-- Columna Lateral Sticky: Registro e Información de Cupos (Rediseñada y más compacta) -->
                <div class="space-y-6 md:sticky md:top-24">
                  
                  <div class="gdg-card border border-black/5 shadow-google-card p-4 sm:p-5 space-y-4">
                    <div class="space-y-2">
                      <h3 class="text-base font-bold text-text-primary font-google">Registro de asistencia</h3>
                      
                      <!-- Estado de cupos -->
                      @if (event()!.available_spots !== undefined) {
                        @if (event()!.is_full) {
                          <div class="inline-flex items-center gap-1.5 rounded-full bg-google-red/10 text-google-red px-3 py-1 text-xs font-semibold">
                            <span class="material-symbols-rounded text-base" aria-hidden="true">block</span>
                            <span>Entradas agotadas</span>
                          </div>
                        } @else if (event()!.available_spots! <= 10) {
                          <div class="inline-flex items-center gap-1.5 rounded-full bg-google-red/10 text-google-red px-3 py-1 text-xs font-semibold animate-pulse">
                            <span class="material-symbols-rounded text-base" aria-hidden="true">warning</span>
                            <span>¡Solo quedan {{ event()!.available_spots }} lugares!</span>
                          </div>
                        } @else {
                          <div class="inline-flex items-center gap-1.5 rounded-full bg-google-green/10 text-google-green px-3 py-1 text-xs font-semibold">
                            <span class="material-symbols-rounded text-base" aria-hidden="true">confirmation_number</span>
                            <span>{{ event()!.available_spots }} disponibles</span>
                          </div>
                        }
                      }
                    </div>

                    <div class="border-t border-black/5 pt-4">
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

      <!-- Footer Global Premium de Ancho Completo -->
      <footer class="pt-6 border-t border-black/5 bg-transparent w-full mt-auto shrink-0">
        <div class="gdg-container">
          <div class="flex flex-col md:flex-row items-center justify-between gap-4 pb-4">
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
              <div class="flex items-center gap-3 text-xs font-bold text-text-secondary">
                <a
                  href="https://gdgtarija.com/code-of-conduct/"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="hover:text-google-blue transition-colors duration-200"
                >
                  Código de conducta
                </a>
                <span class="text-text-secondary/20">•</span>
                <a
                  href="https://gdgtarija.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="hover:text-google-blue transition-colors duration-200"
                >
                  Comunidad
                </a>
              </div>

              <!-- Redes Sociales vectoriales -->
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
                        <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      }
                      @case ('instagram') {
                        <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051C.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                        </svg>
                      }
                      @case ('facebook') {
                        <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      }
                      @case ('youtube') {
                        <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.507 9.388.507 9.388.507s7.517 0 9.388-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                      }
                      @default {
                        <span class="material-symbols-rounded text-base" aria-hidden="true">link</span>
                      }
                    }
                  </a>
                }
              </div>
            </div>
          </div>
        </div> <!-- Cierre de gdg-container -->

        <!-- Barra de colores GDG al final de ancho completo -->
        <div class="h-[3px] w-full grid grid-cols-4 mt-2 shrink-0">
          <div class="bg-google-blue"></div>
          <div class="bg-google-red"></div>
          <div class="bg-google-yellow"></div>
          <div class="bg-google-green"></div>
        </div>
      </footer>

    </section>
  `,
})
export class EventDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly events = inject(PublicEventsService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly loading = signal(true);
  readonly event = signal<Event | null>(null);

  readonly logoIcon = LOGOS.icon;
  readonly socials = socialsData;

  // Estado para la visualización del texto extendido
  readonly showFullDescription = signal(false);

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
      case 'MEETUP': return 'bg-google-blue/10 text-google-blue';
      case 'CONFERENCE': return 'bg-google-red/10 text-google-red';
      case 'WORKSHOP': return 'bg-google-yellow/10 text-google-yellow';
      case 'HACKATHON': return 'bg-google-green/10 text-google-green';
      default: return 'bg-black/5 text-text-secondary';
    }
  });

  /** Etiqueta legible del tipo de evento */
  readonly typeLabel = computed((): string => {
    const type = this.event()?.event_type;
    switch (type) {
      case 'MEETUP': return 'Meetup';
      case 'CONFERENCE': return 'Conferencia';
      case 'WORKSHOP': return 'Taller';
      case 'HACKATHON': return 'Hackathon';
      default: return type ?? '';
    }
  });

  /** Badge de color de marca para la modalidad */
  readonly modalityBadgeClass = computed((): string => {
    const type = this.event()?.location_type;
    switch (type) {
      case 'PHYSICAL': return 'bg-google-green/10 text-google-green';
      case 'VIRTUAL': return 'bg-google-red/10 text-google-red';
      case 'HYBRID': return 'bg-google-yellow/10 text-google-yellow';
      default: return 'bg-black/5 text-text-secondary';
    }
  });

  get slug(): string {
    return this.route.snapshot.paramMap.get('slug') ?? '';
  }

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    this.event.set(await this.events.getBySlug(this.slug));
    this.loading.set(false);
  }

  private dateLabelFormat(date: Date): string {
    return new Intl.DateTimeFormat('es-BO', {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
    }).format(date);
  }
}
