import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';

import { AuthService } from '../../../../../core/auth/services/auth.service';
import { SessionWithTrack } from '../../../../../core/models/session.model';
import { SbSessions } from '../../../../../core/services/supabase/sb-sessions';
import { RegistrationStatus } from '../../../../../models/registration.model';
import { TicketType } from '../../../../../models/ticket.model';
import type { Event as EventModel } from '../../data/event.model';
import { RegistrationsService } from '../data/registrations.service';
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
      transition: background-color 0.2s ease;
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
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
      border: 1px solid rgba(0, 0, 0, 0.04) !important;
    }

    /* Estado seleccionado: Azul Google */
    ::ng-deep .mat-step-icon-selected {
      background-color: #4285F4 !important;
      color: #ffffff !important;
      border-color: #4285F4 !important;
      box-shadow: 0 4px 10px rgba(66, 133, 244, 0.2) !important;
      transform: scale(1.05);
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
      transition: color 0.2s ease;
    }
    ::ng-deep .mat-step-label-selected {
      color: #202124 !important;
      font-weight: 700 !important;
    }
  `],
  template: `
    <div class="space-y-6 bg-transparent p-0">
      @if (!auth.user()) {
        <div class="space-y-3">
          <p class="text-text-secondary text-sm">Iniciá sesión para registrarte al evento.</p>
          <button
            mat-flat-button
            type="button"
            class="gdg-btn-filled w-full"
            (click)="auth.signInWithGoogle()"
          >
            Iniciar sesión con Google
          </button>
        </div>
      } @else if (initLoading()) {
        <div class="flex items-center gap-3 text-text-secondary">
          <mat-progress-spinner mode="indeterminate" diameter="22" aria-label="Cargando registro" />
          <span class="text-sm">Cargando opciones de registro...</span>
        </div>
      } @else if (alreadyRegistered()) {
        @if (sessions().length > 0) {
          <!-- Si el usuario ya está registrado pero el evento tiene sesiones/agenda -->
          <div class="space-y-4">
            <div class="rounded-2xl border border-google-blue/20 bg-google-blue/5 p-5 space-y-1">
              <div class="flex items-center gap-2 text-google-blue font-bold text-sm">
                <span class="material-symbols-rounded text-lg" aria-hidden="true">event_available</span>
                <span>Inscripción confirmada</span>
              </div>
              <p class="text-xs text-text-secondary leading-relaxed">
                Ya estás registrado para este evento. A continuación podés modificar o elegir tus sesiones de la agenda.
              </p>
            </div>

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
          </div>
        } @else {
          <!-- Mensaje simple de ya registrado si el evento no tiene sesiones -->
          <div class="rounded-2xl border border-google-green/20 bg-google-green/5 p-5 space-y-2">
            <div class="flex items-center gap-2 text-google-green font-bold text-sm">
              <span class="material-symbols-rounded text-lg" aria-hidden="true">check_circle</span>
              <span>Ya estás registrado</span>
            </div>
            <p class="text-xs text-text-secondary leading-relaxed">
              Tu inscripción ya existe para este evento. Próximamente verás aquí tu QR.
            </p>
          </div>
        }
      } @else {
        <mat-stepper #stepper [linear]="false" orientation="vertical">
          <mat-step label="Tus datos">
            <app-step-datos
              [event]="event()"
              [tickets]="tickets()"
              (stepComplete)="onStep1Complete($event)"
            />
          </mat-step>

          <mat-step label="Sesiones">
            <app-step-sesiones
              [sessions]="sessions()"
              [(selectedIds)]="selectedSessionIds"
              (next)="onStep2Next()"
              (back)="onStep2Back()"
            />
          </mat-step>

          <mat-step label="Confirmar">
            <app-step-confirmar
              [step1Data]="step1Data()"
              [sessions]="sessions()"
              [selectedSessionIds]="selectedSessionIds()"
              [submitting]="submitting()"
              [success]="success()"
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

  @ViewChild('stepper') private stepper!: MatStepper;

  readonly initLoading = signal(true);
  readonly submitting = signal(false);
  readonly success = signal(false);
  readonly error = signal<string | null>(null);
  readonly alreadyRegistered = signal(false);
  readonly existingRegistrationId = signal<string | null>(null);

  readonly tickets = signal<TicketType[]>([]);
  readonly sessions = signal<SessionWithTrack[]>([]);
  readonly step1Data = signal<StepDatosOutput | null>(null);
  readonly selectedSessionIds = signal<string[]>([]);

  ngOnInit(): void {
    void this.init();
  }

  private async init(): Promise<void> {
    this.initLoading.set(true);
    try {
      console.log('[Checkout] Initiating load for eventId:', this.event().id);
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
      console.log('[Checkout] Loaded tickets count:', tickets.length, tickets);
      console.log('[Checkout] Loaded sessions count:', sessions.length, sessions);
      this.tickets.set(tickets);
      this.sessions.set(sessions);

      const user = this.auth.user();
      if (user) {
        const existing = await this.registrations.getByEventAndUser(this.event().id, user.id);
        this.alreadyRegistered.set(!!existing);
        if (existing) {
          this.existingRegistrationId.set(existing.id);
          // Cargar las sesiones ya seleccionadas
          const mySessionRegs = await this.sbSessions.getRegistrationsByRegistrationId(existing.id);
          console.log('[Checkout] Sesiones previamente registradas:', mySessionRegs);
          this.selectedSessionIds.set(mySessionRegs);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar el registro';
      console.error('[Checkout] Error during init:', e);
      this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
    } finally {
      this.initLoading.set(false);
    }
  }

  onStep1Complete(data: StepDatosOutput): void {
    this.step1Data.set(data);
    this.stepper.next();
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
    if (!d || !user || this.submitting()) return;

    this.submitting.set(true);
    this.error.set(null);

    try {
      const existing = await this.registrations.getByEventAndUser(this.event().id, user.id);
      if (existing) {
        this.alreadyRegistered.set(true);
        return;
      }

      let paymentProofUrl: string | null = null;
      if (d.ticket.price > 0 && d.paymentProofFile) {
        paymentProofUrl = await this.registrations.uploadPaymentProof(
          d.paymentProofFile,
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

      const status: RegistrationStatus = d.ticket.price > 0 ? 'PENDING' : 'CONFIRMED';
      const registrationId = await this.registrations.createRegistration({
        event_id: this.event().id,
        user_id: user.id,
        ticket_type_id: d.ticket.id,
        event_role: 'ATTENDEE',
        status,
        payment_proof_url: paymentProofUrl,
        custom_responses: Object.fromEntries(
          Object.entries(d.responses).filter(([, v]) => typeof v === 'string' && (v as string).trim().length > 0),
        ) as Record<string, string>,
      });

      if (this.selectedSessionIds().length > 0) {
        await this.sbSessions.saveSessionRegistrations(registrationId, this.selectedSessionIds());
      }

      this.success.set(true);
      this.snackBar.open('¡Registro completado exitosamente!', 'Cerrar', { duration: 4000 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al registrar';
      this.error.set(msg);
      this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
    } finally {
      this.submitting.set(false);
    }
  }

  async updateSessionsOnly(): Promise<void> {
    const regId = this.existingRegistrationId();
    if (!regId || this.submitting()) return;

    this.submitting.set(true);
    try {
      await this.sbSessions.updateSessionRegistrations(regId, this.selectedSessionIds());
      this.snackBar.open('¡Sesiones actualizadas exitosamente!', 'Cerrar', { duration: 4000 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al actualizar sesiones';
      console.error('[Checkout] Error updating sessions:', e);
      this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
    } finally {
      this.submitting.set(false);
    }
  }
}
