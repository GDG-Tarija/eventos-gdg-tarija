import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import type { Html5Qrcode } from 'html5-qrcode';

import {
  PointActivity,
  ScanMessage,
  RaffleService,
  claimMessage,
  extractQrCode,
  extractRegistrationId,
  scanMessage,
} from '../../data/raffle.service';

const LAST_ACTIVITY_KEY = 'tickets:last-activity';
/** Mientras el mismo QR siga frente a la cámara (y 3 s después de que se vaya) no se vuelve a leer. */
const QR_DEBOUNCE_MS = 3000;
/** Tras un error de red se reintenta con el mismo QR, pero no a 10 lecturas por segundo. */
const RETRY_PAUSE_MS = 2000;

const TONE: Record<ScanMessage['tone'], { box: string; icon: string }> = {
  ok: { box: 'border-google-green/30 bg-google-green-light/50', icon: 'check_circle' },
  warn: { box: 'border-google-yellow/40 bg-google-yellow-light/40', icon: 'info' },
  error: { box: 'border-google-red/30 bg-google-red-light/40', icon: 'error' },
};

const MODE_BUTTON = {
  on: 'border-google-blue-dark bg-google-blue-light text-google-blue-dark',
  off: 'border-black/10 bg-white text-text-primary',
};

function cameraErrorMessage(e: unknown): string {
  const reason = `${(e as { name?: string } | null)?.name ?? ''} ${String(e)}`;
  if (/NotAllowed|Permission/i.test(reason)) {
    return 'No tenemos permiso para usar la cámara. Actívalo en la configuración del navegador e inténtalo de nuevo.';
  }
  if (/NotFound|NotReadable|Overconstrained|NotSupported/i.test(reason)) {
    return 'No encontramos una cámara disponible en este dispositivo.';
  }
  return 'No pudimos abrir la cámara. Inténtalo de nuevo.';
}

@Component({
  selector: 'app-ticket-scanner',
  standalone: true,
  imports: [MatFormFieldModule, MatSelectModule],
  host: { class: 'block' },
  template: `
    <div class="space-y-4">
      @if (canAward() && canNetwork()) {
        <div class="grid grid-cols-2 gap-2" role="group" aria-label="Qué quieres escanear">
          <button
            type="button"
            class="min-h-11 rounded-full border px-3 text-sm font-bold"
            [class]="mode() === 'activity' ? modeButton.on : modeButton.off"
            [attr.aria-pressed]="mode() === 'activity'"
            (click)="setMode('activity')"
          >
            Actividad
          </button>
          <button
            type="button"
            class="min-h-11 rounded-full border px-3 text-sm font-bold"
            [class]="mode() === 'networking' ? modeButton.on : modeButton.off"
            [attr.aria-pressed]="mode() === 'networking'"
            (click)="setMode('networking')"
          >
            Networking
          </button>
        </div>
      }

      @if (mode() === 'activity') {
        @if (activitiesError()) {
          <p class="m-0 text-sm text-red-700" role="alert">{{ activitiesError() }}</p>
        } @else if (activities().length === 0) {
          <p class="m-0 text-sm text-text-secondary">
            Este evento todavía no tiene actividades cargadas.
          </p>
        } @else {
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Tu actividad</mat-label>
            <mat-select [value]="activityId()" (selectionChange)="pickActivity($event.value)">
              @for (a of activities(); track a.id) {
                <mat-option [value]="a.id">{{ a.name }}</mat-option>
              }
            </mat-select>
            <mat-hint>Cada persona suma este ticket una sola vez.</mat-hint>
          </mat-form-field>
        }
      }

      <div
        class="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-3xl bg-[#202124]"
      >
        <div id="ticket-reader" class="size-full"></div>
        @if (!running()) {
          <div
            class="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center"
          >
            <span class="material-symbols-rounded text-5xl text-white/60" aria-hidden="true"
              >qr_code_scanner</span
            >
            <button
              type="button"
              class="min-h-12 rounded-full bg-white px-6 text-base font-bold text-[#202124] disabled:opacity-50"
              [disabled]="starting() || needsActivity()"
              (click)="start()"
            >
              {{ starting() ? 'Abriendo cámara…' : 'Abrir cámara' }}
            </button>
            @if (needsActivity() && hasActivities()) {
              <p class="m-0 text-sm text-white/80">Elige primero tu actividad.</p>
            }
          </div>
        }
      </div>

      @if (cameraError()) {
        <p class="m-0 text-sm text-red-700" role="alert">{{ cameraError() }}</p>
      }

      <div aria-live="polite">
        @if (message(); as m) {
          <div
            class="flex items-start gap-2 rounded-2xl border p-3 text-sm font-semibold text-text-primary"
            [class]="tone[m.tone].box"
          >
            <span class="material-symbols-rounded text-lg shrink-0" aria-hidden="true">{{
              tone[m.tone].icon
            }}</span>
            <span>{{ m.text }}</span>
          </div>
        }
      </div>

      @if (running()) {
        <button type="button" class="gdg-btn-outlined min-h-11 w-full text-sm" (click)="stop()">
          Cerrar cámara
        </button>
      }
    </div>
  `,
})
export class TicketScanner implements OnInit, OnDestroy {
  readonly eventId = input.required<string>();
  readonly canAward = input(false);
  /** Networking exige una inscripción propia: el staff del back-office sin inscripción solo da actividades. */
  readonly canNetwork = input(true);
  /** Quien escanea participa del sorteo (solo asistentes); cambia cómo se le cuenta el resultado. */
  readonly inRaffle = input(true);
  /** Avisa cuando se sumó un ticket, para recargar los tickets propios. */
  readonly scanned = output<void>();

  private readonly tickets = inject(RaffleService);
  private scanner: Html5Qrcode | null = null;
  private destroyed = false;
  private lastCode = '';
  private lastAt = 0;
  private pausedUntil = 0;

  readonly tone = TONE;
  readonly modeButton = MODE_BUTTON;
  readonly mode = signal<'networking' | 'activity'>('networking');
  readonly activities = signal<PointActivity[]>([]);
  readonly activitiesError = signal<string | null>(null);
  readonly activityId = signal<string | null>(null);
  readonly running = signal(false);
  readonly starting = signal(false);
  readonly busy = signal(false);
  readonly cameraError = signal<string | null>(null);
  readonly message = signal<ScanMessage | null>(null);
  readonly needsActivity = computed(() => this.mode() === 'activity' && !this.activityId());
  readonly hasActivities = computed(() => this.activities().length > 0);

  ngOnInit(): void {
    if (!this.canAward()) return;
    // Quien atiende un stand casi siempre da tickets de actividad.
    this.mode.set('activity');
    void this.loadActivities();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    void this.stop();
  }

  setMode(mode: 'networking' | 'activity'): void {
    this.mode.set(mode);
    this.message.set(null);
    this.lastCode = '';
  }

  pickActivity(id: string): void {
    this.activityId.set(id);
    this.message.set(null);
    this.lastCode = '';
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, id);
    } catch {
      // Sin almacenamiento (modo privado): solo se pierde la preselección de la próxima vez.
    }
  }

  private async loadActivities(): Promise<void> {
    try {
      const list = await this.tickets.activities(this.eventId());
      this.activities.set(list);
      // Sin actividades cargadas no hay nada que dar: queda el networking, si puede hacerlo.
      if (list.length === 0 && this.canNetwork()) this.mode.set('networking');
      let last: string | null = null;
      try {
        last = localStorage.getItem(LAST_ACTIVITY_KEY);
      } catch {
        // Sin almacenamiento: se elige a mano.
      }
      this.activityId.set(list.some((a) => a.id === last) ? last : null);
    } catch (e) {
      console.error('[TicketScanner] activities failed:', e);
      this.activitiesError.set(
        'No pudimos cargar las actividades. Revisa tu conexión y vuelve a abrir esta página.',
      );
    }
  }

  async start(): Promise<void> {
    await this.stop();
    this.cameraError.set(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraError.set('Este navegador no permite usar la cámara.');
      return;
    }
    this.starting.set(true);
    try {
      // Import dinámico: la librería de la cámara solo se descarga si alguien la abre.
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('ticket-reader');
      this.scanner = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.7;
            return { width: size, height: size };
          },
          aspectRatio: 1,
        },
        (text) => void this.onDecoded(text),
        () => undefined,
      );
      // Se cerró o se salió de la página mientras pedía permiso: la cámara no queda encendida.
      if (this.destroyed || this.scanner !== scanner) {
        await scanner.stop().catch(() => undefined);
        return;
      }
      this.running.set(true);
      // Safari/iOS bloquea el autoplay si el video no está silenciado e inline.
      const video = document.querySelector<HTMLVideoElement>('#ticket-reader video');
      if (video) {
        video.muted = true;
        video.setAttribute('playsinline', 'true');
        if (video.paused) void video.play().catch(() => undefined);
      }
    } catch (e) {
      console.error('[TicketScanner] camera failed:', e);
      this.scanner = null;
      this.cameraError.set(cameraErrorMessage(e));
    } finally {
      this.starting.set(false);
    }
  }

  async stop(): Promise<void> {
    const scanner = this.scanner;
    this.scanner = null;
    if (scanner?.isScanning) {
      try {
        await scanner.stop();
      } catch (e) {
        console.error('[TicketScanner] stop failed:', e);
      }
    }
    this.running.set(false);
  }

  private async onDecoded(text: string): Promise<void> {
    const now = Date.now();
    if (this.destroyed || now < this.pausedUntil) return;
    const sameCode = text === this.lastCode;
    const recent = now - this.lastAt < QR_DEBOUNCE_MS;
    // Cada lectura del mismo QR renueva la espera: no se repite mientras siga frente a la cámara.
    if (sameCode) this.lastAt = now;
    if (this.busy() || (sameCode && recent)) return;
    this.lastCode = text;
    this.lastAt = now;

    // Antes que la entrada: el link de un QR del sorteo también lleva un uuid.
    const qrCode = extractQrCode(text);
    if (qrCode) {
      await this.send(async () => {
        const result = await this.tickets.claim(this.eventId(), qrCode);
        return { message: claimMessage(result, this.inRaffle()), added: result.status === 'ok' };
      });
      return;
    }

    const registrationId = extractRegistrationId(text);
    if (!registrationId) {
      this.show({ tone: 'error', text: 'Este QR no es una entrada de GDG Tarija.' });
      return;
    }
    const activity = this.mode() === 'activity';
    const activityId = activity ? this.activityId() : null;
    if (activity && !activityId) {
      this.lastCode = '';
      this.show({ tone: 'warn', text: 'Elige primero tu actividad.' });
      return;
    }

    await this.send(async () => {
      const result = await this.tickets.scan(this.eventId(), registrationId, activityId);
      return {
        message: scanMessage(result, activity, this.inRaffle()),
        added: result.status === 'ok',
      };
    });
  }

  /** Manda la lectura al servidor y muestra el resultado. */
  private async send(call: () => Promise<{ message: ScanMessage; added: boolean }>): Promise<void> {
    this.busy.set(true);
    try {
      const { message, added } = await call();
      if (this.destroyed) return;
      this.show(message);
      if (added) this.scanned.emit();
    } catch (e) {
      console.error('[TicketScanner] scan failed:', e);
      // Se reintenta con el mismo QR sin sacarlo de la cámara, tras una pausa (sin red no se inunda la API).
      this.lastCode = '';
      this.pausedUntil = Date.now() + RETRY_PAUSE_MS;
      this.show({
        tone: 'error',
        text: 'No se pudo registrar. Revisa tu conexión e inténtalo de nuevo.',
      });
    } finally {
      this.busy.set(false);
    }
  }

  private show(message: ScanMessage): void {
    this.message.set(message);
    try {
      navigator.vibrate?.(message.tone === 'ok' ? 120 : [80, 60, 80]);
    } catch {
      // Sin vibración en este dispositivo.
    }
  }
}
