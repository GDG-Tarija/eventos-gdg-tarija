import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { toObservable } from '@angular/core/rxjs-interop';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { filter, firstValueFrom } from 'rxjs';

import { AuthService } from '../../../core/auth/services/auth.service';
import { Event } from '../events/data/event.model';
import { PublicEventsService } from '../events/data/public-events.service';
import { TicketQr } from '../events/registration/components/ticket-qr/ticket-qr';
import { TicketScanner } from './components/ticket-scanner/ticket-scanner';
import { MyTickets, Ticket, RaffleService } from './data/raffle.service';

const KIND: Record<Ticket['kind'], { icon: string; color: string; title: string }> = {
  checkin: { icon: 'how_to_reg', color: 'text-google-green', title: 'Asistencia' },
  activity: { icon: 'stars', color: 'text-google-yellow', title: 'Actividad' },
  networking: { icon: 'handshake', color: 'text-google-blue', title: 'Networking' },
};

const ROLE: Record<string, string> = { SPEAKER: 'speaker', SPONSOR: 'sponsor', STAFF: 'staff' };

@Component({
  selector: 'app-raffle-tickets',
  standalone: true,
  imports: [RouterLink, MatProgressSpinnerModule, TicketQr, TicketScanner],
  template: `
    <section class="gdg-page min-h-[calc(100vh-64px)] pb-16">
      <div class="gdg-container max-w-3xl space-y-6 pt-6">
        <div>
          <h1
            class="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight font-google m-0"
          >
            Mis tickets del sorteo
          </h1>
          @if (event(); as e) {
            <a
              [routerLink]="['/e', e.slug]"
              class="inline-flex items-center min-h-11 text-sm font-semibold text-google-blue-dark no-underline hover:underline"
            >
              {{ e.title }}
            </a>
          }
        </div>

        <!-- Al volver a la pestaña la sesión se recarga: si ya hay datos no se tapa la página (ni la cámara). -->
        @if ((auth.loading() || loading()) && !data()) {
          <div class="flex justify-center py-16">
            <mat-progress-spinner
              mode="indeterminate"
              diameter="32"
              aria-label="Cargando tus tickets"
            />
          </div>
        } @else if (notFound()) {
          <div class="gdg-card p-8 text-center space-y-4">
            <h2 class="text-xl font-bold text-text-primary font-google m-0">
              No encontramos este evento
            </h2>
            <a
              routerLink="/"
              class="gdg-btn-filled inline-flex items-center min-h-11 text-sm no-underline"
            >
              Ver eventos
            </a>
          </div>
        } @else if (!auth.user()) {
          <div class="gdg-card p-8 sm:p-12 text-center space-y-4">
            <h2 class="text-xl font-bold text-text-primary font-google m-0">
              Inicia sesión para ver tus tickets
            </h2>
            <p class="text-text-secondary text-sm m-0">
              Con la misma cuenta con la que te inscribiste.
            </p>
            <button
              type="button"
              class="gdg-btn-filled min-h-11 text-sm"
              (click)="auth.signInWithGoogle()"
            >
              Continuar con Google
            </button>
          </div>
        } @else if (error()) {
          <div class="gdg-card p-8 text-center space-y-4" role="alert">
            <h2 class="text-xl font-bold text-text-primary font-google m-0">
              No pudimos cargar tus tickets
            </h2>
            <button type="button" class="gdg-btn-filled min-h-11 text-sm" (click)="load()">
              Reintentar
            </button>
          </div>
        } @else if (data(); as d) {
          @if (!d.registration_id && !d.can_award) {
            <div class="gdg-card p-8 text-center space-y-4">
              <h2 class="text-xl font-bold text-text-primary font-google m-0">
                No tienes una inscripción confirmada en este evento
              </h2>
              <a
                [routerLink]="['/e', slug]"
                class="gdg-btn-filled inline-flex items-center min-h-11 text-sm no-underline"
              >
                Ver el evento
              </a>
            </div>
          } @else {
            @if (d.registration_id) {
              <!-- Resumen -->
              <div class="gdg-card border border-black/5 p-5 sm:p-6 space-y-3">
                @if (roleLabel()) {
                  <p class="m-0 text-sm text-text-primary">
                    Estás como {{ roleLabel() }}: no participas del sorteo, pero puedes dar tickets
                    a los asistentes.
                  </p>
                } @else if (d.checked_in) {
                  <p class="m-0 flex items-baseline gap-2">
                    <span class="text-5xl font-extrabold text-text-primary font-google">{{
                      count()
                    }}</span>
                    <span class="text-base font-semibold text-text-secondary">
                      {{ count() === 1 ? 'ticket' : 'tickets' }} para el sorteo
                    </span>
                  </p>
                  <p class="m-0 text-sm text-text-secondary">
                    Cada ticket es una chance más de ganar.
                  </p>
                } @else {
                  <p class="m-0 text-base font-semibold text-text-primary">
                    Haz check-in en la entrada para entrar al sorteo y empezar a sumar tickets.
                  </p>
                }
                @if (!roleLabel()) {
                  <p class="m-0 text-sm text-text-secondary flex items-center gap-1.5">
                    <span
                      class="material-symbols-rounded text-base text-google-blue"
                      aria-hidden="true"
                      >handshake</span
                    >
                    Networking: {{ d.net_count }} de {{ d.net_cap }}
                  </p>
                }
              </div>
            }

            <!-- Escanear -->
            <div class="gdg-card border border-black/5 p-5 sm:p-6 space-y-4">
              <div class="space-y-1">
                <h2 class="text-xl font-bold text-text-primary font-google m-0">Escanear</h2>
                <p class="m-0 text-sm text-text-secondary">
                  @if (d.can_award) {
                    Escanea el QR de quien visitó tu stand o participó en tu actividad.
                    @if (d.registration_id) {
                      También puedes hacer networking.
                    }
                  } @else if (d.net_count >= d.net_cap) {
                    Ya sumaste tus {{ d.net_cap }} tickets de networking. Si escaneas a alguien
                    nuevo, igual le suma a esa persona.
                  } @else {
                    Escanea el QR de otra persona del evento: los dos suman 1 ticket (hasta
                    {{ d.net_cap }} por persona).
                  }
                </p>
              </div>
              <app-ticket-scanner
                [eventId]="eventId()"
                [canAward]="d.can_award"
                [canNetwork]="!!d.registration_id"
                [inRaffle]="d.event_role === 'ATTENDEE'"
                (scanned)="refresh()"
              />
            </div>

            @if (d.registration_id; as regId) {
              <!-- Mi QR -->
              <div class="gdg-card border border-black/5 p-5 sm:p-6 space-y-3">
                <h2 class="text-xl font-bold text-text-primary font-google m-0">Mi QR</h2>
                <p class="m-0 text-sm text-text-secondary">
                  Muéstralo en los stands, al hacer una pregunta o cuando conozcas a alguien.
                </p>
                <app-ticket-qr
                  [registrationId]="regId"
                  [eventTitle]="event()?.title"
                  caption="Muéstralo en la entrada, en los stands y al hacer networking"
                />
              </div>
            }

            @if (d.event_role === 'ATTENDEE') {
              <!-- Tickets -->
              <section class="space-y-3" aria-labelledby="mis-tickets">
                <div class="flex items-center justify-between gap-3">
                  <h2 id="mis-tickets" class="text-xl font-bold text-text-primary font-google m-0">
                    Tus tickets
                  </h2>
                  <button
                    type="button"
                    class="gdg-btn-ghost min-h-11 text-sm"
                    [disabled]="refreshing()"
                    (click)="refresh()"
                  >
                    {{ refreshing() ? 'Actualizando…' : 'Actualizar' }}
                  </button>
                </div>
                @if (refreshError()) {
                  <p class="m-0 text-sm text-red-700" role="alert">
                    No pudimos actualizar. Revisa tu conexión.
                  </p>
                }
                @if (d.tickets.length === 0) {
                  <p class="m-0 text-sm text-text-secondary">
                    Todavía no tienes tickets. Empieza por el check-in en la entrada.
                  </p>
                } @else {
                  <ul class="m-0 p-0 list-none grid grid-cols-1 sm:grid-cols-2 gap-3">
                    @for (t of d.tickets; track $index) {
                      <li
                        class="gdg-card border border-dashed border-black/15 p-4 flex items-center gap-3"
                      >
                        <span
                          class="material-symbols-rounded text-2xl shrink-0"
                          [class]="kind[t.kind].color"
                          aria-hidden="true"
                          >{{ kind[t.kind].icon }}</span
                        >
                        <div class="min-w-0">
                          <p class="m-0 text-xs font-bold uppercase tracking-wide text-text-muted">
                            {{ kind[t.kind].title }}
                          </p>
                          <p class="m-0 text-sm font-semibold text-text-primary break-words">
                            {{ label(t) }}
                          </p>
                          <p class="m-0 text-xs text-text-secondary">
                            {{ time(t.at) }}
                            @if (t.kind === 'networking') {
                              · {{ t.by_me ? 'Lo escaneaste tú' : 'Te escaneó' }}
                            }
                          </p>
                        </div>
                      </li>
                    }
                  </ul>
                }
              </section>

              <!-- Cómo sumar -->
              <section
                class="gdg-card border border-black/5 p-5 sm:p-6 space-y-2"
                aria-labelledby="como-sumar"
              >
                <h2 id="como-sumar" class="text-lg font-bold text-text-primary font-google m-0">
                  Cómo sumar tickets
                </h2>
                <ul class="m-0 pl-5 space-y-1 text-sm text-text-secondary">
                  <li>Check-in en la entrada: 1 ticket (y es lo que te hace entrar al sorteo).</li>
                  <li>Cada stand de sponsors y comunidades: 1 ticket.</li>
                  <li>Cada pregunta en una charla o taller: 1 ticket por sesión.</li>
                  <li>Zona Zen y hackathon: 1 ticket por actividad.</li>
                  <li>
                    Networking: 1 ticket por persona nueva que conozcas, hasta {{ d.net_cap }}.
                  </li>
                </ul>
              </section>
            }
          }
        }
      </div>
    </section>
  `,
})
export class RaffleTickets implements OnInit {
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly events = inject(PublicEventsService);
  private readonly ticketsService = inject(RaffleService);
  private readonly title = inject(Title);

  // toObservable necesita contexto de inyección: va como campo.
  private readonly authLoading$ = toObservable(this.auth.loading);
  /** Solo la última recarga escribe: dos escaneos seguidos no dejan un conteo viejo. */
  private refreshSeq = 0;

  readonly slug = this.route.snapshot.paramMap.get('slug') ?? '';
  readonly kind = KIND;
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly notFound = signal(false);
  readonly event = signal<Event | null>(null);
  readonly data = signal<MyTickets | null>(null);
  readonly refreshing = signal(false);
  readonly refreshError = signal(false);

  readonly eventId = computed(() => this.event()?.id ?? '');
  readonly roleLabel = computed(() => ROLE[this.data()?.event_role ?? ''] ?? null);
  readonly count = computed(() => this.data()?.tickets.length ?? 0);

  constructor() {
    this.title.setTitle('Mis tickets del sorteo | GDG Tarija');
  }

  async ngOnInit(): Promise<void> {
    await firstValueFrom(this.authLoading$.pipe(filter((l) => !l)));
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try {
      // El evento es público: se muestra su nombre aunque no haya sesión.
      const event = this.event() ?? (await this.events.getBySlug(this.slug));
      if (!event) {
        this.notFound.set(true);
        return;
      }
      this.event.set(event);
      this.title.setTitle(`Mis tickets · ${event.title} | GDG Tarija`);
      if (this.auth.user()) this.data.set(await this.ticketsService.myTickets(event.id));
    } catch (e) {
      console.error('[Tickets] load failed:', e);
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  /** Recarga sin cerrar la cámara, después de cada escaneo o con el botón. */
  async refresh(): Promise<void> {
    const event = this.event();
    if (!event) return;
    const seq = ++this.refreshSeq;
    this.refreshing.set(true);
    this.refreshError.set(false);
    try {
      const data = await this.ticketsService.myTickets(event.id);
      if (seq === this.refreshSeq) this.data.set(data);
    } catch (e) {
      console.error('[Tickets] refresh failed:', e);
      if (seq === this.refreshSeq) this.refreshError.set(true);
    } finally {
      if (seq === this.refreshSeq) this.refreshing.set(false);
    }
  }

  label(t: Ticket): string {
    if (t.kind === 'checkin') return 'Check-in en la entrada';
    return t.label || (t.kind === 'networking' ? 'Una persona del evento' : 'Actividad del evento');
  }

  time(at: string): string {
    return new Date(at).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  }
}
