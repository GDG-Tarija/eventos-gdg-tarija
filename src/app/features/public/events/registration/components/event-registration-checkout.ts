import { ChangeDetectorRef, Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { RouterLink } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';

import { AuthService } from '../../../../../core/auth/services/auth.service';
import { SessionWithTrack } from '../../../../../core/models/session.model';
import { SbSessions } from '../../../../../core/services/supabase/sb-sessions';
import { RegistrationStatus } from '../../../../../models/registration.model';
import { TicketType } from '../../../../../models/ticket.model';
import type { Event as EventModel } from '../../data/event.model';
import { isPast as isEventPast } from '../../data/event-timing';
import { compressImage } from '../data/compress-image';
import { toCustomResponses } from '../data/custom-responses';
import { friendlyError } from '../data/friendly-error';
import { priceSummary } from '../data/price-summary';
import { RegistrationsService, TicketSoldOutError } from '../data/registrations.service';
import { TicketTypesService } from '../data/ticket-types.service';
import { UserProfileService } from '../data/user-profile.service';
import { StepConfirmar } from './step-confirmar/step-confirmar';
import { StepDatos, StepDatosOutput } from './step-datos/step-datos';
import { StepSesiones } from './step-sesiones/step-sesiones';

@Component({
  selector: 'app-event-registration-checkout',
  standalone: true,
  imports: [
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatStepperModule,
    RouterLink,
    StepDatos,
    StepSesiones,
    StepConfirmar,
  ],
  styles: [`
    /* Remueve fondos del stepper por defecto */
    ::ng-deep .mat-stepper-vertical {
      background: transparent !important;
    }

    /* Encabezado de los pasos */
    ::ng-deep .mat-stepper-vertical .mat-step-header {
      padding: 14px 8px !important;
      border-radius: 14px;
      transition: background-color 150ms cubic-bezier(0.23, 1, 0.32, 1);
    }
    ::ng-deep .mat-stepper-vertical .mat-step-header:hover {
      background-color: rgba(66, 133, 244, 0.03) !important;
    }

    /* Círculo e Icono del paso */
    ::ng-deep .mat-step-icon {
      background-color: rgba(0, 0, 0, 0.04) !important;
      color: #5f6368 !important;
      font-weight: 700 !important;
      font-family: 'Google Sans', 'Outfit', sans-serif !important;
      border: 1px solid rgba(0, 0, 0, 0.04) !important;
    }

    /* Estado seleccionado: Azul Google */
    ::ng-deep .mat-step-icon-selected {
      background-color: #4285F4 !important;
      color: #ffffff !important;
      border-color: #4285F4 !important;
      box-shadow: 0 4px 10px rgba(66, 133, 244, 0.2) !important;
    }

    /* Estado completado: Verde Google */
    ::ng-deep .mat-step-icon-state-edit,
    ::ng-deep .mat-step-icon-state-done {
      background-color: #34A853 !important;
      color: #ffffff !important;
      border-color: #34A853 !important;
      box-shadow: 0 4px 10px rgba(52, 168, 83, 0.15) !important;
    }

    /* Línea vertical de conexión entre pasos */
    ::ng-deep .mat-stepper-vertical-line::after {
      border-left-color: rgba(0, 0, 0, 0.05) !important;
      border-left-width: 2px !important;
    }

    ::ng-deep .mat-vertical-content-container {
      margin-left: 20px !important;
      padding: 0 0 16px 12px !important;
    }

    ::ng-deep .mat-vertical-content {
      padding: 4px 0 8px 0 !important;
    }

    /* Textos del paso */
    ::ng-deep .mat-step-label {
      font-family: 'Google Sans', 'Outfit', sans-serif !important;
      color: #5f6368 !important;
      font-size: 13.5px !important;
      font-weight: 500 !important;
      transition: color 150ms cubic-bezier(0.23, 1, 0.32, 1);
    }
    ::ng-deep .mat-step-label-selected {
      color: #202124 !important;
      font-weight: 700 !important;
    }
  `],
  template: `
    <div class="space-y-6 bg-transparent p-0">
      @if (error(); as message) {
        <div
          role="alert"
          class="flex items-start gap-2 rounded-2xl border border-google-red/20 bg-google-red/5 p-4 text-sm text-google-red"
        >
          <span class="material-symbols-rounded text-lg shrink-0" aria-hidden="true">error</span>
          <span>{{ message }}</span>
        </div>
      }

      @if (initLoading()) {
        <div class="flex items-center gap-3 text-text-secondary">
          <mat-progress-spinner mode="indeterminate" diameter="22" aria-label="Cargando registro" />
          <span class="text-sm">Cargando opciones de registro...</span>
        </div>
      } @else if (initFailed()) {
        <div class="rounded-2xl border border-black/10 bg-black/[0.02] p-5 space-y-3">
          <p class="text-sm font-bold text-text-primary m-0">No pudimos cargar las entradas</p>
          <p class="text-xs text-text-secondary leading-relaxed m-0">
            Revisa tu conexión e inténtalo de nuevo.
          </p>
          <button
            mat-flat-button
            type="button"
            class="gdg-btn-filled text-xs font-bold"
            (click)="init()"
          >
            Reintentar
          </button>
        </div>
      } @else if (alreadyRegistered()) {
        @let reg = registeredCopy();
        <div class="space-y-4">
          <div [class]="'rounded-2xl border p-5 space-y-1 ' + reg.box">
            <div [class]="'flex items-center gap-2 font-bold text-sm ' + reg.text">
              <span class="material-symbols-rounded text-lg" aria-hidden="true">{{ reg.icon }}</span>
              <span>{{ isPast() && reg.status !== 'CANCELLED' ? 'Este evento ya terminó' : reg.title }}</span>
            </div>
            <p class="text-xs text-text-secondary leading-relaxed m-0">
              {{ reg.body }}
            </p>
          </div>

          @if (isPast()) {
            @if (reg.status !== 'CANCELLED') {
              <a
                routerLink="/certificados"
                class="gdg-btn-outlined inline-flex items-center justify-center px-6 py-2.5 text-xs font-bold no-underline"
              >
                Ver mis certificados
              </a>
            }
          } @else if (sessions().length > 0 && reg.status !== 'CANCELLED') {
            <app-step-sesiones
              [sessions]="sessions()"
              [(selectedIds)]="selectedSessionIds"
              [hideNavigation]="true"
            />

            <div class="flex justify-end pt-2">
              <button
                mat-flat-button
                type="button"
                class="gdg-btn-filled px-6 py-2.5 rounded-full text-xs font-bold"
                [disabled]="submitting()"
                (click)="updateSessionsOnly()"
              >
                @if (submitting()) {
                  <div class="flex items-center gap-2">
                    <mat-progress-spinner mode="indeterminate" diameter="18" strokeWidth="2.5" />
                    <span>Guardando...</span>
                  </div>
                } @else {
                  Guardar selección de sesiones
                }
              </button>
            </div>
          }
        </div>
      } @else if (isPast()) {
        <!-- Si el evento ya pasó y el usuario no está registrado -->
        <div class="rounded-2xl border border-black/10 bg-black/[0.02] p-5 space-y-3">
          <div class="flex items-center gap-2 text-text-secondary font-bold text-sm">
            <span class="material-symbols-rounded text-lg text-text-muted" aria-hidden="true">event_busy</span>
            <span>Evento finalizado</span>
          </div>
          <p class="text-xs text-text-secondary leading-relaxed m-0">
            El registro para este evento ya no está disponible porque el evento concluyó.
          </p>
          @if (!auth.user()) {
            <div class="pt-2 border-t border-black/5 space-y-2">
              <p class="text-xs text-text-muted m-0">¿Ya te habías registrado antes?</p>
              <button
                mat-flat-button
                type="button"
                class="gdg-btn-filled w-full text-xs font-bold"
                (click)="auth.signInWithGoogle('registro')"
              >
                Inicia sesión para ver tu registro
              </button>
            </div>
          }
        </div>
      } @else if (auth.loading()) {
        <div class="flex items-center gap-3 text-text-secondary">
          <mat-progress-spinner mode="indeterminate" diameter="22" aria-label="Verificando sesión" />
          <span class="text-sm">Verificando tu sesión…</span>
        </div>
      } @else if (!auth.user()) {
        <div class="space-y-3">
          @if (summary().price; as price) {
            <p class="text-text-primary text-sm font-semibold m-0">{{ price.label }}</p>
          }
          <p class="text-text-secondary text-sm m-0">
            Inicia sesión con Google para elegir tu entrada e inscribirte.
          </p>
          <button
            mat-flat-button
            type="button"
            class="gdg-btn-filled w-full"
            (click)="auth.signInWithGoogle('registro')"
          >
            Continuar con Google
          </button>
        </div>
      } @else {
        <mat-stepper
          #stepper
          [linear]="true"
          orientation="vertical"
          (selectionChange)="onStepChange($event.selectedIndex)"
        >
          <mat-step label="Tus datos" [completed]="!!step1Data()">
            <app-step-datos
              [event]="event()"
              [tickets]="tickets()"
              (stepComplete)="onStep1Complete($event)"
            />
          </mat-step>

          @if (sessions().length > 0) {
            <mat-step label="Sesiones" [completed]="!!step1Data()">
              <app-step-sesiones
                [sessions]="sessions()"
                [(selectedIds)]="selectedSessionIds"
                (next)="onStep2Next()"
                (back)="onStep2Back()"
              />
            </mat-step>
          }

          <mat-step label="Confirmar" [completed]="success()">
            <app-step-confirmar
              [step1Data]="step1Data()"
              [sessions]="sessions()"
              [selectedSessionIds]="selectedSessionIds()"
              [submitting]="submitting()"
              [status]="createdStatus()"
              (confirm)="submit()"
              (back)="onStep3Back()"
            />
          </mat-step>
        </mat-stepper>
      }
    </div>
  `,
})
export class EventRegistrationCheckout implements OnInit {
  readonly event = input.required<EventModel>();

  readonly auth = inject(AuthService);
  private readonly ticketTypes = inject(TicketTypesService);
  private readonly registrations = inject(RegistrationsService);
  private readonly profiles = inject(UserProfileService);
  private readonly sbSessions = inject(SbSessions);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  // toObservable requiere contexto de inyección
  private readonly authLoading$ = toObservable(this.auth.loading);

  @ViewChild('stepper') private stepper!: MatStepper;

  readonly isPast = computed(() => {
    const e = this.event();
    return !!e && isEventPast(e);
  });

  readonly initLoading = signal(true);
  readonly submitting = signal(false);
  readonly createdStatus = signal<RegistrationStatus | null>(null);
  readonly success = computed(() => this.createdStatus() !== null);
  readonly initFailed = signal(false);
  readonly registeredStatus = signal<RegistrationStatus>('CONFIRMED');
  readonly error = signal<string | null>(null);
  readonly alreadyRegistered = signal(false);
  readonly existingRegistrationId = signal<string | null>(null);

  readonly registeredCopy = computed(() => {
    const status = this.registeredStatus();
    const hasSessions = this.sessions().length > 0;
    switch (status) {
      case 'PENDING':
        return {
          status,
          icon: 'hourglass_top',
          title: 'Inscripción en revisión',
          body: 'Tu inscripción está registrada y tu pago está en revisión. Te avisaremos cuando lo validemos.',
          box: 'border-google-yellow/30 bg-google-yellow/5',
          text: 'text-text-primary',
        };
      case 'CANCELLED':
        return {
          status,
          icon: 'cancel',
          title: 'Inscripción anulada',
          body: 'Tu inscripción fue anulada. Si crees que es un error, escríbenos por Soporte.',
          box: 'border-google-red/20 bg-google-red/5',
          text: 'text-google-red',
        };
      default:
        return {
          status,
          icon: 'check_circle',
          title: 'Ya estás inscrito',
          body: hasSessions
            ? 'Puedes modificar o elegir tus sesiones de la agenda.'
            : 'Te esperamos el día del evento.',
          box: 'border-google-green/20 bg-google-green/5',
          text: 'text-google-green',
        };
    }
  });

  readonly tickets = signal<TicketType[]>([]);

  /** Lo lee la página de detalle (chip de precio y barra móvil). */
  readonly summary = computed(() => ({
    ready: !this.initLoading(),
    price: priceSummary(this.tickets()),
    registered: this.alreadyRegistered(),
  }));
  readonly sessions = signal<SessionWithTrack[]>([]);
  readonly step1Data = signal<StepDatosOutput | null>(null);
  readonly selectedSessionIds = signal<string[]>([]);

  ngOnInit(): void {
    void this.init();
  }

  async init(): Promise<void> {
    this.initLoading.set(true);
    this.initFailed.set(false);
    try {
      const [tickets, sessions] = await Promise.all([
        this.ticketTypes.listByEventId(this.event().id).catch(err => {
          console.error('[Checkout] Error loading tickets:', err);
          throw err;
        }),
        this.sbSessions.listByEvent(this.event().id).catch(err => {
          console.error('[Checkout] Error loading sessions:', err);
          return [] as SessionWithTrack[];
        }),
      ]);
      this.tickets.set(tickets);
      this.sessions.set(sessions);

      // Sin esperar a auth se vería el login (o el formulario) a un usuario ya inscrito.
      await firstValueFrom(this.authLoading$.pipe(filter((loading) => !loading)));
      const user = this.auth.user();
      if (user) await this.loadExisting(user.id);
    } catch (e) {
      console.error('[Checkout] Error during init:', e);
      this.initFailed.set(true);
    } finally {
      this.initLoading.set(false);
    }
  }

  /** Carga la inscripción existente (si hay) y sus sesiones. Devuelve si el usuario ya está inscrito. */
  private async loadExisting(userId: string): Promise<boolean> {
    const existing = await this.registrations.getByEventAndUser(this.event().id, userId);
    this.alreadyRegistered.set(!!existing);
    if (!existing) return false;
    this.existingRegistrationId.set(existing.id);
    this.registeredStatus.set(existing.status);
    this.selectedSessionIds.set(await this.sbSessions.getRegistrationsByRegistrationId(existing.id));
    return true;
  }

  onStep1Complete(data: StepDatosOutput): void {
    this.step1Data.set(data);
    // En modo lineal next() exige el paso completado: aplicar el [completed] antes de avanzar.
    this.cdr.detectChanges();
    this.stepper.next();
  }

  /** Volver al paso 1 invalida los datos: nunca se envía información desactualizada. */
  onStepChange(index: number): void {
    if (index === 0 && !this.success()) this.step1Data.set(null);
  }

  onStep2SelectionChange(ids: string[]): void {
    this.selectedSessionIds.set(ids);
  }

  onStep2Next(): void {
    this.stepper.next();
  }

  onStep2Back(): void {
    this.stepper.previous();
  }

  onStep3Back(): void {
    this.stepper.previous();
  }

  async submit(): Promise<void> {
    const d = this.step1Data();
    const user = this.auth.user();
    if (!d || !user || this.submitting() || this.success()) return;

    this.submitting.set(true);
    this.error.set(null);

    try {
      if (await this.loadExisting(user.id)) return;

      let paymentProofUrl: string | null = null;
      if (d.ticket.price > 0 && d.paymentProofFile) {
        paymentProofUrl = await this.registrations.uploadPaymentProof(
          await compressImage(d.paymentProofFile),
          this.event().id,
          user.id,
        );
      }

      const updatedProfile = await this.profiles.updateProfile(user.id, {
        first_name: d.firstName,
        last_name: d.lastName,
        phone: d.phone,
      });
      if (updatedProfile) {
        this.auth.user.set({ ...user, ...updatedProfile });
      }

      const created = await this.registrations.createRegistration({
        event_id: this.event().id,
        user_id: user.id,
        ticket_type_id: d.ticket.id,
        event_role: d.appliedRole ?? 'ATTENDEE',
        payment_proof_url: paymentProofUrl,
        custom_responses: toCustomResponses(d.responses),
        coupon_id: d.couponId || null,
      });

      if (this.selectedSessionIds().length > 0) {
        await this.sbSessions.saveSessionRegistrations(created.id, this.selectedSessionIds());
      }

      this.createdStatus.set(created.status);
    } catch (e) {
      if (e instanceof TicketSoldOutError) {
        await this.handleSoldOut(d.ticket);
        return;
      }
      console.error('[Checkout] Error registering:', e);
      // 23505: ya existía una inscripción (p. ej. otra pestaña); mostrar su estado en vez de un error.
      if (e instanceof Error && e.message.includes('23505')) {
        try {
          if (await this.loadExisting(user.id)) return;
        } catch (err) {
          console.error('[Checkout] Error loading existing registration:', err);
        }
      }
      this.error.set(friendlyError(e));
    } finally {
      this.submitting.set(false);
    }
  }

  /** El cupo de la fase (o del paquete) se agotó mientras se registraba: refresca y avisa. */
  private async handleSoldOut(previous: TicketType): Promise<void> {
    try {
      this.tickets.set(await this.ticketTypes.listByEventId(this.event().id));
    } catch (err) {
      console.error('[Checkout] Error refreshing tickets:', err);
    }
    this.step1Data.set(null);
    this.stepper.selectedIndex = 0;

    const current = this.tickets().find((t) => t.id === previous.id);
    let msg: string;
    if (!current || current.sold_out) {
      msg = `Los cupos de «${previous.name}» se agotaron. Elige otra entrada.`;
    } else if (current.price !== previous.price) {
      const label = current.price > 0 ? `Bs ${current.price}` : 'gratis';
      msg = `La preventa se agotó, el precio ahora es ${label}. Revisa el pago y vuelve a confirmar.`;
    } else {
      msg = 'La fase de preventa se agotó. Revisa los datos de tu entrada y vuelve a confirmar.';
    }
    this.error.set(msg);
  }

  async updateSessionsOnly(): Promise<void> {
    const regId = this.existingRegistrationId();
    if (!regId || this.submitting()) return;

    this.submitting.set(true);
    this.error.set(null);
    try {
      await this.sbSessions.updateSessionRegistrations(regId, this.selectedSessionIds());
      this.snackBar.open('¡Sesiones actualizadas exitosamente!', 'Cerrar', { duration: 4000 });
    } catch (e) {
      console.error('[Checkout] Error updating sessions:', e);
      this.error.set(friendlyError(e));
    } finally {
      this.submitting.set(false);
    }
  }
}
