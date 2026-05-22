import { Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../../../core/auth/services/auth.service';
import { FormField } from '../../../../../models/field.model';
import { RegistrationPayload, RegistrationStatus } from '../../../../../models/registration.model';
import { TicketType } from '../../../../../models/ticket.model';
import type { Event as EventModel } from '../../data/event.model';
import { RegistrationsService } from '../data/registrations.service';
import { TicketTypesService } from '../data/ticket-types.service';
import { UserProfileService } from '../data/user-profile.service';

type ExtraInfo = { form_fields?: FormField[] };

@Component({
  selector: 'app-event-registration-checkout',
  standalone: true,
  imports: [MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule],
  template: `
    <div class="gdg-card p-6 sm:p-10 space-y-8">
      <h2 class="gdg-h2">Registro</h2>

      @if (!auth.user()) {
        <div class="space-y-3">
          <p class="text-text-secondary">Iniciá sesión para registrarte al evento.</p>
          <button mat-flat-button type="button" class="gdg-btn-filled" (click)="auth.signInWithGoogle()">
            Iniciar sesión con Google
          </button>
        </div>
      } @else {
        @if (initLoading()) {
          <div class="flex items-center gap-3 text-text-secondary">
            <mat-progress-spinner mode="indeterminate" diameter="22" aria-label="Cargando registro" />
            <span>Cargando opciones de registro...</span>
          </div>
        } @else if (alreadyRegistered()) {
          <div class="gdg-card p-6">
            <div class="flex items-center gap-2 text-google-green font-semibold">
              <span class="material-symbols-rounded" aria-hidden="true">check_circle</span>
              <span>Ya estás registrado</span>
            </div>
            <p class="mt-2 text-text-secondary">
              Tu inscripción ya existe para este evento. Próximamente verás aquí tu QR.
            </p>
          </div>
        } @else if (success()) {
          <div class="gdg-card p-6">
            <div class="flex items-center gap-2 text-google-green font-semibold">
              <span class="material-symbols-rounded" aria-hidden="true">check_circle</span>
              <span>Registro completado</span>
            </div>
            <p class="mt-2 text-text-secondary">
              Tu registro se guardó correctamente. Próximamente verás aquí tu QR.
            </p>
          </div>
        } @else {
          @if (error()) {
            <div class="rounded-2xl border border-google-red/20 bg-google-red/5 p-4 text-sm text-text-secondary">
              <strong class="text-google-red">Error:</strong> {{ error() }}
            </div>
          }

          <!-- Paso 1: Perfil -->
          <div class="space-y-4">
            <h3 class="text-xl font-bold text-text-primary">Tus datos</h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <mat-form-field appearance="outline">
                <mat-label>Nombre</mat-label>
                <input matInput [value]="firstName()" (input)="firstName.set(($any($event.target).value ?? '').toString())" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Apellido</mat-label>
                <input matInput [value]="lastName()" (input)="lastName.set(($any($event.target).value ?? '').toString())" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="sm:col-span-2">
                <mat-label>Celular</mat-label>
                <input matInput [value]="phone()" (input)="phone.set(($any($event.target).value ?? '').toString())" />
              </mat-form-field>
            </div>
          </div>

          <!-- Paso 2: Tickets -->
          <div class="space-y-4">
            <h3 class="text-xl font-bold text-text-primary">Elegí tu pase</h3>

            @if (tickets().length === 0) {
              <p class="text-text-secondary">No hay pases disponibles por el momento.</p>
            } @else {
              <div class="flex flex-col gap-4">
                @for (t of tickets(); track t.id) {
                  <button
                    type="button"
                    class="gdg-card p-5 text-left transition-shadow duration-300 ease-in-out hover:shadow-md"
                    [class.border-google-blue]="selectedTicketId() === t.id"
                    [class.border-2]="selectedTicketId() === t.id"
                    (click)="selectTicket(t)"
                  >
                    <div class="flex items-start justify-between gap-4">
                      <div class="min-w-0">
                        <div class="text-lg font-bold text-text-primary break-words">{{ t.name }}</div>
                        <div class="mt-1 text-sm text-text-secondary">Cupo: {{ t.ticket_capacity }}</div>
                      </div>
                      <div class="shrink-0 text-google-blue font-bold">
                        @if (t.price > 0) {
                          Bs {{ t.price }}
                        } @else {
                          Gratis
                        }
                      </div>
                    </div>
                  </button>
                }
              </div>
            }
          </div>

          <!-- Paso 3: Preguntas dinámicas -->
          @if (fields().length > 0) {
            <div class="space-y-4">
              <h3 class="text-xl font-bold text-text-primary">Información adicional</h3>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                @for (f of fields(); track f.key) {
                  <mat-form-field appearance="outline" class="sm:col-span-2">
                    <mat-label>{{ f.label }}</mat-label>
                    <input
                      matInput
                      [value]="responses()[f.key] || ''"
                      (input)="setResponse(f.key, ($any($event.target).value ?? '').toString())"
                    />
                  </mat-form-field>
                }
              </div>
            </div>
          }

          <!-- Comprobante (solo pagos) -->
          @if (selectedTicketPrice() > 0) {
            <div class="space-y-3">
              <h3 class="text-xl font-bold text-text-primary">Comprobante de pago</h3>
              <p class="text-sm text-text-secondary">Subí una imagen del comprobante para validar tu inscripción.</p>
              <input type="file" accept="image/*" (change)="onFileChange($event)" />
              @if (paymentProofName()) {
                <p class="text-sm text-text-secondary">Archivo: <strong>{{ paymentProofName() }}</strong></p>
              }
            </div>
          }

          <div class="pt-2">
            <button
              mat-flat-button
              type="button"
              class="gdg-btn-filled w-full"
              [disabled]="!canSubmit()"
              (click)="submit()"
            >
              @if (submitting()) { Registrando... } @else { Confirmar registro }
            </button>
          </div>
        }
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

  readonly initLoading = signal(true);
  readonly submitting = signal(false);
  readonly success = signal(false);
  readonly error = signal<string | null>(null);

  readonly alreadyRegistered = signal(false);

  readonly tickets = signal<TicketType[]>([]);
  readonly selectedTicketId = signal<string | null>(null);
  readonly selectedTicketPrice = signal(0);

  readonly firstName = signal('');
  readonly lastName = signal('');
  readonly phone = signal('');

  readonly fields = signal<FormField[]>([]);
  readonly responses = signal<Record<string, string | undefined>>({});

  readonly paymentProofFile = signal<File | null>(null);
  readonly paymentProofName = computed(() => this.paymentProofFile()?.name ?? '');

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (!user) return;

      // Prefill from profile
      this.firstName.set(user.first_name ?? '');
      this.lastName.set(user.last_name ?? '');
      this.phone.set(user.phone ?? '');
    });
  }

  ngOnInit(): void {
    void this.init();
  }

  private parseFields(extraInfo: unknown): FormField[] {
    const obj = extraInfo as ExtraInfo | null | undefined;
    const fields = obj?.form_fields;
    if (!Array.isArray(fields)) return [];
    return fields
      .filter((f) => typeof f?.key === 'string' && typeof f?.label === 'string')
      .map((f) => ({ key: f.key, label: f.label, required: !!f.required }));
  }

  private async init(): Promise<void> {
    this.initLoading.set(true);
    this.error.set(null);

    const fields = this.parseFields(this.event().extra_info ?? null);
    this.fields.set(fields);

    try {
      const tickets = await this.ticketTypes.listByEventId(this.event().id);
      this.tickets.set(tickets);

      const user = this.auth.user();
      if (user) {
        const existing = await this.registrations.getByEventAndUser(this.event().id, user.id);
        this.alreadyRegistered.set(!!existing);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar el registro';
      this.error.set(msg);
    } finally {
      this.initLoading.set(false);
    }
  }

  selectTicket(t: TicketType): void {
    this.selectedTicketId.set(t.id);
    this.selectedTicketPrice.set(Number(t.price ?? 0));
    this.paymentProofFile.set(null);
  }

  setResponse(key: string, value: string): void {
    this.responses.update((prev) => ({ ...prev, [key]: value }));
  }

  onFileChange(event: globalThis.Event): void {
    const inputEl = event.target as HTMLInputElement | null;
    const file = inputEl?.files?.item(0) ?? null;
    this.paymentProofFile.set(file);
  }

  readonly canSubmit = computed(() => {
    if (!this.auth.user()) return false;
    if (this.initLoading() || this.submitting()) return false;
    if (this.alreadyRegistered() || this.success()) return false;

    if (!this.phone().trim()) return false;
    if (!this.selectedTicketId()) return false;

    // Dynamic required fields
    const responses = this.responses();
    for (const f of this.fields()) {
      if (!f.required) continue;
      const v = (responses[f.key] ?? '').trim();
      if (!v) return false;
    }

    // Payment proof required for paid tickets
    if (this.selectedTicketPrice() > 0 && !this.paymentProofFile()) return false;
    return true;
  });

  private computeStatus(): RegistrationStatus {
    return this.selectedTicketPrice() > 0 ? 'PENDING' : 'CONFIRMED';
  }

  async submit(): Promise<void> {
    if (!this.canSubmit()) return;
    const user = this.auth.user();
    if (!user) return;

    this.submitting.set(true);
    this.error.set(null);

    try {
      const existing = await this.registrations.getByEventAndUser(this.event().id, user.id);
      if (existing) {
        this.alreadyRegistered.set(true);
        return;
      }

      const price = this.selectedTicketPrice();
      let paymentProofUrl: string | null = null;

      if (price > 0) {
        const file = this.paymentProofFile();
        if (!file) throw new Error('Falta comprobante de pago');
        paymentProofUrl = await this.registrations.uploadPaymentProof(file, this.event().id, user.id);
      }

      const payload: RegistrationPayload = {
        userUpdate: {
          first_name: this.firstName().trim(),
          last_name: this.lastName().trim(),
          phone: this.phone().trim(),
        },
        registration: {
          event_id: this.event().id,
          user_id: user.id,
          ticket_type_id: this.selectedTicketId()!,
          event_role: 'ATTENDEE',
          status: this.computeStatus(),
          payment_proof_url: paymentProofUrl,
          custom_responses: Object.fromEntries(
            Object.entries(this.responses()).filter(([, v]) => typeof v === 'string' && v.trim().length > 0),
          ) as Record<string, string>,
        },
      };

      await this.profiles.updateProfile(user.id, payload.userUpdate);
      await this.registrations.createRegistration(payload.registration);

      this.success.set(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : `Error al registrar: ${String(e)}`;
      this.error.set(msg);
    } finally {
      this.submitting.set(false);
    }
  }
}
