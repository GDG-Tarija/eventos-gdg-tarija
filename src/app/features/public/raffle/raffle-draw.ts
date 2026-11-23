import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { toObservable } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormField as SignalFormField, form, validate } from '@angular/forms/signals';
import { filter, firstValueFrom } from 'rxjs';

import { AuthService } from '../../../core/auth/services/auth.service';
import { Event } from '../events/data/event.model';
import { PublicEventsService } from '../events/data/public-events.service';
import { DrawResult, RaffleWinner, RaffleService } from './data/raffle.service';

@Component({
  selector: 'app-raffle-draw',
  standalone: true,
  imports: [
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    SignalFormField,
  ],
  template: `
    <section class="gdg-page min-h-[calc(100vh-64px)] pb-16">
      <div class="gdg-container max-w-3xl space-y-6 pt-6">
        <div class="space-y-1">
          <h1
            class="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight font-google m-0"
          >
            Sorteo
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

        <!-- Al volver a la pestaña la sesión se recarga: con el evento ya cargado no se tapa el sorteo. -->
        @if ((auth.loading() || loading()) && !event()) {
          <div class="flex justify-center py-16">
            <mat-progress-spinner
              mode="indeterminate"
              diameter="32"
              aria-label="Cargando el sorteo"
            />
          </div>
        } @else if (!auth.user()) {
          <div class="gdg-card p-8 text-center space-y-4">
            <h2 class="text-xl font-bold text-text-primary font-google m-0">
              Inicia sesión para sortear
            </h2>
            <button
              type="button"
              class="gdg-btn-filled min-h-11 text-sm"
              (click)="auth.signInWithGoogle()"
            >
              Continuar con Google
            </button>
          </div>
        } @else if (loadError()) {
          <div class="gdg-card p-8 text-center space-y-4" role="alert">
            <h2 class="text-xl font-bold text-text-primary font-google m-0">{{ loadError() }}</h2>
            @if (notFound()) {
              <a routerLink="/" class="gdg-btn-filled inline-flex items-center min-h-11 text-sm no-underline">
                Ver eventos
              </a>
            } @else {
              <button type="button" class="gdg-btn-filled min-h-11 text-sm" (click)="load()">
                Reintentar
              </button>
            }
          </div>
        } @else if (!isSuperadmin()) {
          <div class="gdg-card p-8 text-center space-y-2">
            <h2 class="text-xl font-bold text-text-primary font-google m-0">
              Solo para organizadores
            </h2>
            @if (event(); as e) {
              <a
                [routerLink]="['/e', e.slug, 'tickets']"
                class="inline-flex items-center min-h-11 text-sm font-semibold text-google-blue-dark no-underline hover:underline"
              >
                Ver mis tickets del sorteo
              </a>
            }
          </div>
        } @else {
          <form
            class="gdg-card border border-black/5 p-5 sm:p-6 space-y-3"
            (submit)="$event.preventDefault(); draw()"
          >
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Premio</mat-label>
              <input matInput [formField]="prizeForm.prize" autocomplete="off" />
              @if (prizeForm.prize().invalid() && prizeForm.prize().touched()) {
                <mat-error class="text-xs">{{ prizeForm.prize().errors()[0]?.message }}</mat-error>
              }
            </mat-form-field>
            <button
              type="submit"
              class="gdg-btn-filled min-h-12 w-full text-base"
              [disabled]="drawing()"
            >
              {{ drawing() ? 'Sorteando…' : 'Sortear' }}
            </button>
            @if (drawError()) {
              <p class="m-0 text-sm text-red-700" role="alert">{{ drawError() }}</p>
            }
          </form>

          <div aria-live="polite">
            @if (result(); as r) {
              @if (r.status === 'ok') {
                <div class="gdg-card border border-black/5 p-8 text-center space-y-2">
                  <p class="m-0 text-sm font-bold uppercase tracking-wide text-text-muted">
                    {{ lastPrize() }}
                  </p>
                  <p
                    class="m-0 text-4xl sm:text-6xl font-extrabold text-google-blue-dark font-google break-words"
                  >
                    {{ r.name || 'Sin nombre' }}
                  </p>
                  <p class="m-0 text-sm text-text-secondary">
                    con {{ r.tickets }} {{ r.tickets === 1 ? 'ticket' : 'tickets' }}, entre
                    {{ r.participants }} {{ r.participants === 1 ? 'participante' : 'participantes' }}
                  </p>
                </div>
              } @else {
                <p class="gdg-card m-0 p-6 text-center text-text-secondary">
                  Ya no quedan participantes sin premio.
                </p>
              }
            }
          </div>

          @if (winners().length) {
            <section class="space-y-3" aria-labelledby="ganadores">
              <h2 id="ganadores" class="text-xl font-bold text-text-primary font-google m-0">
                Ganadores
              </h2>
              <ul class="m-0 p-0 list-none space-y-2">
                @for (w of winners(); track w.id) {
                  <li
                    class="gdg-card border border-black/5 p-4 flex flex-wrap items-center justify-between gap-2"
                  >
                    <span class="font-semibold text-text-primary">{{ w.name }}</span>
                    <span class="text-sm text-text-secondary"
                      >{{ w.prize }} · {{ w.tickets }} {{ w.tickets === 1 ? 'ticket' : 'tickets' }}</span
                    >
                  </li>
                }
              </ul>
              <p class="m-0 text-xs text-text-muted">
                Si alguien no está presente, vuelve a sortear el mismo premio.
              </p>
            </section>
          }
        }
      </div>
    </section>
  `,
})
export class RaffleDraw implements OnInit {
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly events = inject(PublicEventsService);
  private readonly tickets = inject(RaffleService);
  private readonly title = inject(Title);

  // toObservable necesita contexto de inyección: va como campo.
  private readonly authLoading$ = toObservable(this.auth.loading);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly notFound = signal(false);
  readonly event = signal<Event | null>(null);
  readonly isSuperadmin = signal(false);
  readonly winners = signal<RaffleWinner[]>([]);
  readonly drawing = signal(false);
  readonly drawError = signal<string | null>(null);
  readonly result = signal<DrawResult | null>(null);
  readonly lastPrize = signal('');

  readonly prizeData = signal({ prize: '' });
  readonly prizeForm = form(this.prizeData, (path) => {
    validate(path.prize, (ctx) =>
      ctx.value().trim() ? undefined : { kind: 'required', message: 'Escribe el premio' },
    );
  });

  constructor() {
    this.title.setTitle('Sorteo | GDG Tarija');
  }

  async ngOnInit(): Promise<void> {
    await firstValueFrom(this.authLoading$.pipe(filter((l) => !l)));
    await this.load();
  }

  async load(): Promise<void> {
    if (!this.auth.user()) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const [event, role] = await Promise.all([
        this.events.getBySlug(this.route.snapshot.paramMap.get('slug') ?? ''),
        this.tickets.myRole(),
      ]);
      if (!event) {
        this.notFound.set(true);
        this.loadError.set('No encontramos este evento');
        return;
      }
      this.event.set(event);
      this.isSuperadmin.set(role === 'SUPERADMIN');
      if (role === 'SUPERADMIN') this.winners.set(await this.tickets.winners(event.id));
    } catch (e) {
      console.error('[Raffle] load failed:', e);
      this.loadError.set('No pudimos cargar el sorteo');
    } finally {
      this.loading.set(false);
    }
  }

  async draw(): Promise<void> {
    const event = this.event();
    if (!event || this.drawing()) return;
    // markAsTouched() sobre la raíz no alcanza al campo: sin esto no se ve "Escribe el premio".
    this.prizeForm.prize().markAsTouched();
    if (this.prizeForm().invalid()) return;
    const prize = this.prizeData().prize.trim();
    this.drawing.set(true);
    this.drawError.set(null);
    this.result.set(null);
    try {
      const result = await this.tickets.draw(event.id, prize);
      this.lastPrize.set(prize);
      this.result.set(result);
    } catch (e) {
      console.error('[Raffle] draw failed:', e);
      this.drawError.set('No se pudo sortear. Revisa la lista de ganadores antes de volver a intentarlo.');
    } finally {
      this.drawing.set(false);
    }
    // Aparte del sorteo: si solo falla la lista, no parece que el sorteo falló (y nadie sortea dos veces).
    // También se recarga tras un error, por si el sorteo sí se guardó y se perdió la respuesta.
    try {
      this.winners.set(await this.tickets.winners(event.id));
    } catch (e) {
      console.error('[Raffle] winners reload failed:', e);
    }
  }
}
