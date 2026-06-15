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
    ::ng-deep .mat-stepper-vertical .mat-step-header {
      padding: 12px 6px;
    }
    ::ng-deep .mat-vertical-content-container {
      margin-left: 20px;
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
        <div class="rounded-2xl border border-google-green/20 bg-google-green/5 p-5 space-y-2">
          <div class="flex items-center gap-2 text-google-green font-bold text-sm">
            <span class="material-symbols-rounded text-lg" aria-hidden="true">check_circle</span>
            <span>Ya estás registrado</span>
          </div>
          <p class="text-xs text-text-secondary leading-relaxed">
            Tu inscripción ya existe para este evento. Próximamente verás aquí tu QR.
          </p>
        </div>
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
              (selectionChange)="onStep2SelectionChange($event)"
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
      const [tickets, sessions] = await Promise.all([
        this.ticketTypes.listByEventId(this.event().id),
        this.sbSessions.listByEvent(this.event().id).catch(() => [] as SessionWithTrack[]),
      ]);
      this.tickets.set(tickets);
      this.sessions.set(sessions);

      const user = this.auth.user();
      if (user) {
        const existing = await this.registrations.getByEventAndUser(this.event().id, user.id);
        this.alreadyRegistered.set(!!existing);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar el registro';
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
}
