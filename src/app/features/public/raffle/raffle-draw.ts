import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { toObservable } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormField as SignalFormField, form, maxLength, validate } from '@angular/forms/signals';
import { filter, firstValueFrom } from 'rxjs';

import { AuthService } from '../../../core/auth/services/auth.service';
import { Event } from '../events/data/event.model';
import { PublicEventsService } from '../events/data/public-events.service';
import {
  REEL_LAND_MS,
  RafflePhase,
  RaffleScreen,
  Reel,
  landReel,
  loopReel,
} from './components/raffle-screen/raffle-screen';
import { RaffleWorld } from './components/raffle-world/raffle-world';
import { DrawResult, PoolEntry, RaffleService, RaffleWinner } from './data/raffle.service';

/** La ruleta gira al menos esto, aunque el servidor responda antes. */
const SPIN_MS = 1800;
/** Fila de la ruleta donde cae el ganador: cuántos nombres pasan mientras frena. */
const REEL_STOP = 30;
/** Pausa con la ruleta ya quieta sobre el ganador, antes de revelarlo. */
const HOLD_MS = 450;
/** Cada cuánto se vuelve a leer quiénes participan y con cuántos tickets. */
const REFRESH_MS = 20_000;
const CONFETTI_COLORS = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];

interface ConfettiPiece {
  left: number;
  delay: number;
  duration: number;
  color: string;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

@Component({
  selector: 'app-raffle-draw',
  standalone: true,
  imports: [
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    SignalFormField,
    RaffleScreen,
    RaffleWorld,
  ],
  templateUrl: './raffle-draw.html',
  styleUrl: './raffle-draw.scss',
})
export class RaffleDraw implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly events = inject(PublicEventsService);
  private readonly raffle = inject(RaffleService);
  private readonly title = inject(Title);

  // toObservable necesita contexto de inyección: va como campo.
  private readonly authLoading$ = toObservable(this.auth.loading);
  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  private destroyed = false;
  private poll?: ReturnType<typeof setInterval>;
  private refreshes = 0;

  /** El letrero del fondo, letra por letra para pintarlas con los colores de Google. */
  readonly sign = [...'GDG TARIJA'];

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly notFound = signal(false);
  readonly event = signal<Event | null>(null);
  readonly isSuperadmin = signal(false);
  readonly winners = signal<RaffleWinner[]>([]);
  readonly pool = signal<PoolEntry[]>([]);

  readonly phase = signal<RafflePhase>('idle');
  readonly reel = signal<Reel>({ names: [], stop: 0 });
  readonly result = signal<DrawResult | null>(null);
  /** El ganador tal como estaba en el grupo: su muñeco festeja al frente. */
  readonly winnerEntry = signal<PoolEntry | null>(null);
  readonly lastPrize = signal('');
  /** Chance que tenía el ganador al momento del sorteo (0–1). */
  readonly winnerChance = signal(0);
  readonly drawError = signal<string | null>(null);
  readonly confetti = signal<ConfettiPiece[]>([]);
  readonly fullscreen = signal(false);

  /** Ganador con el "¿Eliminar?" abierto, y ganador cuyo cambio se está guardando. */
  readonly confirmDeleteId = signal<string | null>(null);
  readonly busyWinnerId = signal<string | null>(null);
  readonly winnerError = signal<string | null>(null);

  readonly totalTickets = computed(() => this.pool().reduce((sum, p) => sum + p.tickets, 0));
  readonly topChances = computed(() => {
    const total = this.totalTickets();
    const max = this.pool()[0]?.tickets ?? 1;
    return this.pool()
      .slice(0, 10)
      .map((p) => ({ ...p, chance: total ? p.tickets / total : 0, bar: (p.tickets / max) * 100 }));
  });
  readonly spinning = computed(() => this.phase() === 'spinning');
  /** Los tachados no cuentan: su premio se vuelve a sortear. */
  readonly delivered = computed(() => this.winners().filter((w) => !w.voided).length);
  readonly worldMode = computed(() => {
    const phase = this.phase();
    return phase === 'empty' ? 'idle' : phase;
  });

  readonly prizeData = signal({ prize: '' });
  readonly prizeForm = form(this.prizeData, (path) => {
    validate(path.prize, (ctx) =>
      ctx.value().trim() ? undefined : { kind: 'required', message: 'Escribe el premio' },
    );
    // El servidor rechaza premios de más de 200 caracteres.
    maxLength(path.prize, 200, { message: 'Máximo 200 caracteres' });
  });

  constructor() {
    this.title.setTitle('Sorteo | GDG Tarija');
  }

  async ngOnInit(): Promise<void> {
    await firstValueFrom(this.authLoading$.pipe(filter((l) => !l)));
    await this.load();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    clearInterval(this.poll);
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.fullscreen.set(!!document.fullscreenElement);
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
        this.raffle.myRole(),
      ]);
      if (!event) {
        this.notFound.set(true);
        this.loadError.set('No encontramos este evento');
        return;
      }
      this.event.set(event);
      this.title.setTitle(`Sorteo · ${event.title} | GDG Tarija`);
      this.isSuperadmin.set(role === 'SUPERADMIN');
      if (role === 'SUPERADMIN') {
        await this.refresh();
        // Los tickets se siguen ganando durante el evento: el mundo se pone al día solo.
        this.poll ??= setInterval(() => {
          if (!this.spinning() && !this.busyWinnerId() && !document.hidden) void this.refresh();
        }, REFRESH_MS);
      }
    } catch (e) {
      console.error('[Raffle] load failed:', e);
      this.loadError.set('No pudimos cargar el sorteo');
    } finally {
      this.loading.set(false);
    }
  }

  async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await this.stage()?.nativeElement.requestFullscreen();
    } catch (e) {
      console.error('[Raffle] fullscreen failed:', e);
    }
  }

  async draw(): Promise<void> {
    const event = this.event();
    if (!event || this.spinning()) return;
    // markAsTouched() sobre la raíz no alcanza al campo: sin esto no se ve "Escribe el premio".
    this.prizeForm.prize().markAsTouched();
    if (this.prizeForm().invalid()) return;

    const prize = this.prizeData().prize.trim();
    const before = this.pool();
    const names = before.map((p) => p.name);
    const totalBefore = this.totalTickets();
    this.drawError.set(null);
    this.result.set(null);
    this.winnerEntry.set(null);
    this.confetti.set([]);
    this.lastPrize.set(prize);

    // El servidor elige al ganador; la ruleta solo lo revela.
    const outcome: { result?: DrawResult; error?: unknown } = {};
    const request = this.raffle.draw(event.id, prize).then(
      (result) => void (outcome.result = result),
      (error) => void (outcome.error = error ?? new Error('draw failed')),
    );

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const animate = !reduceMotion && names.length > 1;
    this.reel.set(animate ? loopReel(names) : { names: [], stop: 0 });
    // Siempre en "sorteando" mientras responde el servidor: así nadie sortea dos veces.
    this.phase.set('spinning');
    await Promise.all([request, animate ? sleep(SPIN_MS) : null]);
    if (this.destroyed) return;
    if (animate && outcome.result?.status === 'ok') {
      this.reel.set(landReel(names, outcome.result.name || 'Sin nombre', REEL_STOP));
      await sleep(REEL_LAND_MS + HOLD_MS);
      if (this.destroyed) return;
    }

    const result = outcome.result;
    if (outcome.error || !result) {
      console.error('[Raffle] draw failed:', outcome.error);
      this.phase.set('idle');
      this.drawError.set(
        'No se pudo sortear. Revisa la lista de ganadores antes de volver a intentarlo.',
      );
    } else if (result.status === 'empty') {
      this.phase.set('empty');
    } else {
      this.result.set(result);
      this.winnerEntry.set(before.find((p) => p.registrationId === result.registration_id) ?? null);
      this.winnerChance.set(totalBefore ? (result.tickets ?? 0) / totalBefore : 0);
      this.phase.set('revealed');
      if (!reduceMotion) this.burstConfetti();
    }

    // Aparte del sorteo: si solo falla la recarga, no parece que el sorteo falló (y nadie sortea dos veces).
    // También se recarga tras un error, por si el sorteo sí se guardó y se perdió la respuesta.
    await this.refresh();
  }

  async toggleVoided(winner: RaffleWinner): Promise<void> {
    await this.changeWinner(winner.id, () =>
      this.raffle.setWinnerVoided(winner.id, !winner.voided),
    );
  }

  async deleteWinner(winner: RaffleWinner): Promise<void> {
    await this.changeWinner(winner.id, () => this.raffle.deleteWinner(winner.id));
  }

  private async changeWinner(id: string, change: () => Promise<void>): Promise<void> {
    if (this.busyWinnerId() || this.spinning()) return;
    this.busyWinnerId.set(id);
    this.winnerError.set(null);
    try {
      await change();
      this.confirmDeleteId.set(null);
      // El escenario ya no vale: pudo estar festejando a quien se acaba de tachar o eliminar.
      this.phase.set('idle');
      this.result.set(null);
      this.winnerEntry.set(null);
    } catch (e) {
      console.error('[Raffle] winner change failed:', e);
      this.winnerError.set('No se pudo guardar el cambio. Inténtalo de nuevo.');
    }
    await this.refresh();
    this.busyWinnerId.set(null);
  }

  private async refresh(): Promise<void> {
    const event = this.event();
    if (!event) return;
    const turn = ++this.refreshes;
    try {
      const [winners, pool] = await Promise.all([
        this.raffle.winners(event.id),
        this.raffle.pool(event.id),
      ]);
      // Una recarga vieja que llega tarde no pisa a la más nueva.
      if (turn !== this.refreshes) return;
      this.winners.set(winners);
      this.pool.set(pool);
    } catch (e) {
      console.error('[Raffle] refresh failed:', e);
    }
  }

  private burstConfetti(): void {
    this.confetti.set(
      Array.from({ length: 90 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.4 + Math.random() * 1.8,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      })),
    );
    setTimeout(() => {
      if (!this.destroyed) this.confetti.set([]);
    }, 5000);
  }

  percent(chance: number): string {
    return `${(chance * 100).toLocaleString('es-BO', { maximumFractionDigits: 1 })}%`;
  }
}
