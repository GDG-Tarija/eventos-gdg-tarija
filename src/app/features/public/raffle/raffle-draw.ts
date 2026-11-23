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
import { DrawResult, PoolEntry, RaffleService, RaffleWinner } from './data/raffle.service';

/** El suspenso dura al menos esto, aunque el servidor responda antes. */
const SPIN_MS = 2600;
/** Frenada final: cada nombre se queda más tiempo hasta caer en el ganador. */
const BRAKE_MS = [110, 160, 230, 320, 450, 620];
const CONFETTI_COLORS = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];

type Phase = 'idle' | 'spinning' | 'revealed' | 'empty';

interface ConfettiPiece {
  left: number;
  delay: number;
  duration: number;
  color: string;
  rotate: number;
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

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly notFound = signal(false);
  readonly event = signal<Event | null>(null);
  readonly isSuperadmin = signal(false);
  readonly winners = signal<RaffleWinner[]>([]);
  readonly pool = signal<PoolEntry[]>([]);

  readonly phase = signal<Phase>('idle');
  readonly rollingName = signal('');
  readonly result = signal<DrawResult | null>(null);
  readonly lastPrize = signal('');
  /** Chance que tenía el ganador al momento del sorteo (0–1). */
  readonly winnerChance = signal(0);
  readonly drawError = signal<string | null>(null);
  readonly confetti = signal<ConfettiPiece[]>([]);
  readonly fullscreen = signal(false);

  readonly totalTickets = computed(() => this.pool().reduce((sum, p) => sum + p.tickets, 0));
  readonly topChances = computed(() => {
    const total = this.totalTickets();
    const max = this.pool()[0]?.tickets ?? 1;
    return this.pool()
      .slice(0, 10)
      .map((p) => ({ ...p, chance: total ? p.tickets / total : 0, bar: (p.tickets / max) * 100 }));
  });
  readonly spinning = computed(() => this.phase() === 'spinning');

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
      if (role === 'SUPERADMIN') await this.refresh();
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
    const names = this.pool().map((p) => p.name);
    const totalBefore = this.totalTickets();
    this.drawError.set(null);
    this.result.set(null);
    this.confetti.set([]);
    this.lastPrize.set(prize);

    // El servidor elige al ganador; la animación solo lo revela.
    const outcome: { result?: DrawResult; error?: unknown; done: boolean } = { done: false };
    const request = this.raffle.draw(event.id, prize).then(
      (result) => Object.assign(outcome, { result, done: true }),
      (error) => Object.assign(outcome, { error, done: true }),
    );

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduceMotion || names.length < 2) {
      await request;
    } else {
      this.phase.set('spinning');
      const started = Date.now();
      while (!outcome.done || Date.now() - started < SPIN_MS) {
        this.rollingName.set(names[Math.floor(Math.random() * names.length)]);
        await sleep(70);
        if (this.destroyed) return;
      }
      if (outcome.result?.status === 'ok') {
        for (const ms of BRAKE_MS) {
          this.rollingName.set(names[Math.floor(Math.random() * names.length)]);
          await sleep(ms);
          if (this.destroyed) return;
        }
      }
    }

    if (outcome.error || !outcome.result) {
      console.error('[Raffle] draw failed:', outcome.error);
      this.phase.set('idle');
      this.drawError.set(
        'No se pudo sortear. Revisa la lista de ganadores antes de volver a intentarlo.',
      );
    } else if (outcome.result.status === 'empty') {
      this.phase.set('empty');
    } else {
      this.result.set(outcome.result);
      this.winnerChance.set(totalBefore ? (outcome.result.tickets ?? 0) / totalBefore : 0);
      this.phase.set('revealed');
      if (!reduceMotion) this.burstConfetti();
    }

    // Aparte del sorteo: si solo falla la recarga, no parece que el sorteo falló (y nadie sortea dos veces).
    // También se recarga tras un error, por si el sorteo sí se guardó y se perdió la respuesta.
    await this.refresh();
  }

  private async refresh(): Promise<void> {
    const event = this.event();
    if (!event) return;
    try {
      const [winners, pool] = await Promise.all([
        this.raffle.winners(event.id),
        this.raffle.pool(event.id),
      ]);
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
        rotate: Math.random() * 360,
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
