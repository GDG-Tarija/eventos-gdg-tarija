import { Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { form, FormField as SignalFormField, required } from '@angular/forms/signals';

import { AuthService } from '../../../../../core/auth/services/auth.service';
import { FormField } from '../../../../../models/field.model';
import { RegistrationPayload, RegistrationStatus } from '../../../../../models/registration.model';
import { TicketType } from '../../../../../models/ticket.model';
import type { Event as EventModel } from '../../data/event.model';
import { RegistrationsService } from '../data/registrations.service';
import { TicketTypesService } from '../data/ticket-types.service';
import { UserProfileService } from '../data/user-profile.service';

type ExtraInfo = { form_fields?: FormField[] };

interface CheckoutFormData {
  firstName: string;
  lastName: string;
  phone: string;
  responses: Record<string, string>;
}

@Component({
  selector: 'app-event-registration-checkout',
  standalone: true,
  imports: [MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, SignalFormField],
  template: `
    <div class="space-y-6 bg-transparent p-0">

      @if (!auth.user()) {
        <div class="space-y-3">
          <p class="text-text-secondary">Iniciá sesión para registrarte al evento.</p>
          <button mat-flat-button type="button" class="gdg-btn-filled w-full" (click)="auth.signInWithGoogle()">
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
          <div class="rounded-2xl border border-google-green/20 bg-google-green/5 p-5 space-y-2">
            <div class="flex items-center gap-2 text-google-green font-bold text-sm">
              <span class="material-symbols-rounded text-lg" aria-hidden="true">check_circle</span>
              <span>Ya estás registrado</span>
            </div>
            <p class="text-xs text-text-secondary leading-relaxed">
              Tu inscripción ya existe para este evento. Próximamente verás aquí tu QR.
            </p>
          </div>
        } @else if (success()) {
          <div class="rounded-2xl border border-google-green/20 bg-google-green/5 p-5 space-y-2">
            <div class="flex items-center gap-2 text-google-green font-bold text-sm">
              <span class="material-symbols-rounded text-lg" aria-hidden="true">check_circle</span>
              <span>Registro completado</span>
            </div>
            <p class="text-xs text-text-secondary leading-relaxed">
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
            <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Tus datos</h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Nombre</mat-label>
                <input matInput [formField]="checkoutForm.firstName" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Apellido</mat-label>
                <input matInput [formField]="checkoutForm.lastName" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="sm:col-span-2 w-full">
                <mat-label>Celular</mat-label>
                <input matInput [formField]="checkoutForm.phone" />
              </mat-form-field>
            </div>
          </div>

          <!-- Paso 2: Tickets -->
          <div class="space-y-3">
            <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Elegí tu pase</h3>

            @if (selectedTicketId()) {
              <p class="text-xs text-text-secondary">
                Seleccionado: <strong>{{ selectedTicketPrice() > 0 ? 'De pago' : 'Gratis' }}</strong>
              </p>
            }

            @if (tickets().length === 0) {
              <p class="text-sm text-text-secondary">No hay pases disponibles por el momento.</p>
            } @else {
              <div class="flex flex-col gap-3">
                @for (t of tickets(); track t.id) {
                  <button
                    type="button"
                    class="w-full rounded-2xl border border-black/5 p-4 text-left transition-all duration-200 hover:bg-black/[0.01] hover:border-black/10 active:scale-[0.99] cursor-pointer"
                    [class.border-google-blue]="selectedTicketId() === t.id"
                    [class.bg-google-blue/[0.02]]="selectedTicketId() === t.id"
                    [class.border-2]="selectedTicketId() === t.id"
                    (click)="selectTicket(t)"
                  >
                    <div class="flex items-start justify-between gap-4">
                      <div class="min-w-0">
                        <div class="text-sm font-bold text-text-primary truncate">{{ t.name }}</div>
                        <div class="mt-0.5 text-xs text-text-secondary">Cupo: {{ t.ticket_capacity }}</div>
                      </div>
                      <div class="shrink-0 text-google-blue font-bold text-sm">
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
            <div class="space-y-3">
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Información adicional</h3>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                @for (f of fields(); track f.key) {
                  <mat-form-field appearance="outline" class="sm:col-span-2 w-full">
                    <mat-label>{{ f.label }}</mat-label>
                    <input
                      matInput
                      [formField]="checkoutForm.responses[f.key]"
                    />
                  </mat-form-field>
                }
              </div>
            </div>
          }
          @else {
            <div class="space-y-1">
              <h3 class="text-xs font-bold text-text-primary uppercase tracking-wider">Información adicional</h3>
              <p class="text-xs text-text-secondary">Este evento no requiere preguntas adicionales.</p>
            </div>
          }

          <!-- Comprobante (solo pagos) -->
          @if (selectedTicketPrice() > 0) {
            <div class="space-y-3 pt-2">
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Comprobante de pago</h3>
              <p class="text-xs text-text-secondary">Subí una imagen del comprobante para validar tu inscripción.</p>

              @if (selectedTicketQrUrl()) {
                <div class="rounded-2xl border border-black/5 p-4 space-y-2 bg-black/[0.01]">
                  <div class="flex items-center gap-2 text-google-blue font-bold text-xs">
                    <span class="material-symbols-rounded text-base" aria-hidden="true">qr_code_2</span>
                    <span>QR de pago</span>
                  </div>
                  <p class="text-[11px] text-text-secondary">Escaneá este QR para realizar el pago.</p>
                  <div class="mt-2 flex justify-center">
                    <img
                      class="w-full max-w-[200px] rounded-xl border border-black/5 bg-white object-contain"
                      [src]="selectedTicketQrUrl()!"
                      alt="QR de pago"
                    />
                  </div>
                </div>
              }

              <input type="file" accept="image/*" class="text-xs w-full cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-google-blue/10 file:text-google-blue hover:file:bg-google-blue/20" (change)="onFileChange($event)" />
              @if (paymentProofName()) {
                <p class="text-xs text-text-secondary">Archivo: <strong>{{ paymentProofName() }}</strong></p>
              }
            </div>
          }

          <div class="pt-2">
            <button
              mat-flat-button
              type="button"
              class="gdg-btn-filled w-full text-xs font-bold"
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
  readonly selectedTicketQrUrl = signal<string | null>(null);

  readonly fields = signal<FormField[]>([]);

  readonly paymentProofFile = signal<File | null>(null);
  readonly paymentProofName = computed(() => this.paymentProofFile()?.name ?? '');

  // Formulario con Signals
  readonly formData = signal<CheckoutFormData>({
    firstName: '',
    lastName: '',
    phone: '',
    responses: {},
  });

  readonly checkoutForm = form(this.formData, (path) => {
    required(path.firstName);
    required(path.lastName);
    required(path.phone);
    // Validar de forma dinámica las respuestas requeridas
    for (const f of this.fields()) {
      if (f.required) {
        required(path.responses[f.key]);
      }
    }
  });

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (!user) return;

      // Prefacturar formulario a partir del perfil
      this.formData.update((prev) => ({
        ...prev,
        firstName: user.first_name ?? '',
        lastName: user.last_name ?? '',
        phone: user.phone ?? '',
      }));
    });
  }

  ngOnInit(): void {
    void this.init();
  }

  private parseFields(extraInfo: unknown): FormField[] {
    let normalized: unknown = extraInfo;
    if (typeof normalized === 'string') {
      try {
        normalized = JSON.parse(normalized) as unknown;
      } catch {
        return [];
      }
    }

    const obj = normalized as ExtraInfo | null | undefined;
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

    // Inicializar propiedades dinámicas del formulario en respuestas
    const initialResponses: Record<string, string> = {};
    for (const f of fields) {
      initialResponses[f.key] = '';
    }
    this.formData.update((prev) => ({
      ...prev,
      responses: initialResponses,
    }));

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
    this.selectedTicketQrUrl.set(t.payment_qr_url ?? null);
    this.paymentProofFile.set(null);
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

    // Validación declarativa de Signal Forms
    if (this.checkoutForm().invalid()) return false;
    if (!this.selectedTicketId()) return false;

    // Se requiere comprobante de pago para tickets pagos
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

      const data = this.formData();
      const payload: RegistrationPayload = {
        userUpdate: {
          first_name: data.firstName.trim(),
          last_name: data.lastName.trim(),
          phone: data.phone.trim(),
        },
        registration: {
          event_id: this.event().id,
          user_id: user.id,
          ticket_type_id: this.selectedTicketId()!,
          event_role: 'ATTENDEE',
          status: this.computeStatus(),
          payment_proof_url: paymentProofUrl,
          custom_responses: Object.fromEntries(
            Object.entries(data.responses).filter(([, v]) => typeof v === 'string' && v.trim().length > 0),
          ) as Record<string, string>,
        },
      };

      const updatedProfile = await this.profiles.updateProfile(user.id, payload.userUpdate);
      if (updatedProfile) {
        this.auth.user.set({
          ...user,
          ...updatedProfile,
        });
      }
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
