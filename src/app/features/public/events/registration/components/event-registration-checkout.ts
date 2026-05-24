import { Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  form,
  FormField as SignalFormField,
  required,
  minLength,
  pattern,
  validateTree,
} from '@angular/forms/signals';

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
  responses: Record<string, any>;
}

@Component({
  selector: 'app-event-registration-checkout',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    SignalFormField,
  ],
  template: `
    <div class="space-y-6 bg-transparent p-0">
      @if (!auth.user()) {
        <div class="space-y-3">
          <p class="text-text-secondary">Iniciá sesión para registrarte al evento.</p>
          <button
            mat-flat-button
            type="button"
            class="gdg-btn-filled w-full"
            (click)="auth.signInWithGoogle()"
          >
            Iniciar sesión con Google
          </button>
        </div>
      } @else {
        @if (initLoading()) {
          <div class="flex items-center gap-3 text-text-secondary">
            <mat-progress-spinner
              mode="indeterminate"
              diameter="22"
              aria-label="Cargando registro"
            />
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
          <!-- Paso 1: Perfil -->
          <div class="space-y-4">
            <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Tus datos</h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Nombre</mat-label>
                <input matInput [formField]="checkoutForm.firstName" />
                @if (checkoutForm.firstName().invalid() && checkoutForm.firstName().touched()) {
                  <mat-error class="text-xs">{{
                    checkoutForm.firstName().errors()[0]?.message
                  }}</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Apellido</mat-label>
                <input matInput [formField]="checkoutForm.lastName" />
                @if (checkoutForm.lastName().invalid() && checkoutForm.lastName().touched()) {
                  <mat-error class="text-xs">{{
                    checkoutForm.lastName().errors()[0]?.message
                  }}</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="sm:col-span-2 w-full">
                <mat-label>Celular</mat-label>
                <input matInput [formField]="checkoutForm.phone" />
                @if (checkoutForm.phone().invalid() && checkoutForm.phone().touched()) {
                  <mat-error class="text-xs">{{
                    checkoutForm.phone().errors()[0]?.message
                  }}</mat-error>
                }
              </mat-form-field>
            </div>
          </div>

          <!-- Paso 2: Tickets -->
          <div class="space-y-3">
            <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">
              Elegí tu pase
            </h3>

            @if (selectedTicketId()) {
              <p class="text-xs text-text-secondary">
                Seleccionado:
                <strong>{{ selectedTicketPrice() > 0 ? 'De pago' : 'Gratis' }}</strong>
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
                        <div class="mt-0.5 text-xs text-text-secondary">
                          Cupo: {{ t.ticket_capacity }}
                        </div>
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
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">
                Información adicional
              </h3>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                @for (f of fields(); track f.key) {
                  @if (f.type === 'checkbox') {
                    <div class="sm:col-span-2 py-1">
                      <mat-checkbox [formField]="checkoutForm.responses[f.key]">
                        <span class="text-xs text-text-primary leading-tight">
                          {{ f.label }}{{ f.required ? ' *' : '' }}
                        </span>
                      </mat-checkbox>
                      @if (
                        checkoutForm.responses[f.key]().invalid() &&
                        checkoutForm.responses[f.key]().touched()
                      ) {
                        <div class="text-[11px] text-google-red mt-1 px-1">
                          {{ checkoutForm.responses[f.key]().errors()[0]?.message }}
                        </div>
                      }
                    </div>
                  } @else if (f.type === 'select') {
                    <mat-form-field appearance="outline" class="sm:col-span-2 w-full">
                      <mat-label>{{ f.label }}{{ f.required ? ' *' : ' (opcional)' }}</mat-label>
                      <mat-select [formField]="checkoutForm.responses[f.key]" [placeholder]="f.placeholder ?? ''">
                        @for (opt of f.options ?? []; track opt) {
                          <mat-option [value]="opt">{{ opt }}</mat-option>
                        }
                      </mat-select>
                      @if (
                        checkoutForm.responses[f.key]().invalid() &&
                        checkoutForm.responses[f.key]().touched()
                      ) {
                        <mat-error class="text-xs">{{
                          checkoutForm.responses[f.key]().errors()[0]?.message
                        }}</mat-error>
                      }
                    </mat-form-field>
                  } @else {
                    <mat-form-field appearance="outline" class="sm:col-span-2 w-full">
                      <mat-label>{{ f.label }}{{ f.required ? ' *' : ' (opcional)' }}</mat-label>
                      <input
                        matInput
                        [type]="f.type === 'number' ? 'number' : 'text'"
                        [formField]="checkoutForm.responses[f.key]"
                        [placeholder]="f.placeholder ?? ''"
                      />
                      @if (
                        checkoutForm.responses[f.key]().invalid() &&
                        checkoutForm.responses[f.key]().touched()
                      ) {
                        <mat-error class="text-xs">{{
                          checkoutForm.responses[f.key]().errors()[0]?.message
                        }}</mat-error>
                      }
                    </mat-form-field>
                  }
                }
              </div>
            </div>
          } @else {
            <div class="space-y-1">
              <h3 class="text-xs font-bold text-text-primary uppercase tracking-wider">
                Información adicional
              </h3>
              <p class="text-xs text-text-secondary">
                Este evento no requiere preguntas adicionales.
              </p>
            </div>
          }

          <!-- Comprobante (solo pagos) -->
          @if (selectedTicketPrice() > 0) {
            <div class="space-y-3 pt-2">
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">
                Comprobante de pago
              </h3>
              <p class="text-xs text-text-secondary">
                Subí una imagen del comprobante para validar tu inscripción.
              </p>

              @if (selectedTicketQrUrl()) {
                <div class="rounded-2xl border border-black/5 p-4 space-y-2 bg-black/[0.01]">
                  <div class="flex items-center gap-2 text-google-blue font-bold text-xs">
                    <span class="material-symbols-rounded text-base" aria-hidden="true"
                      >qr_code_2</span
                    >
                    <span>QR de pago</span>
                  </div>
                  <p class="text-[11px] text-text-secondary">
                    Escaneá este QR para realizar el pago.
                  </p>
                  <div class="mt-2 flex justify-center">
                    <img
                      class="w-full max-w-[200px] rounded-xl border border-black/5 bg-white object-contain"
                      [src]="selectedTicketQrUrl()!"
                      alt="QR de pago"
                    />
                  </div>
                </div>
              }

              <input
                type="file"
                accept="image/*"
                class="text-xs w-full cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-google-blue/10 file:text-google-blue hover:file:bg-google-blue/20"
                (change)="onFileChange($event)"
              />
              @if (paymentProofName()) {
                <p class="text-xs text-text-secondary">
                  Archivo: <strong>{{ paymentProofName() }}</strong>
                </p>
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
              @if (submitting()) {
                Registrando...
              } @else {
                Confirmar registro
              }
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
  private readonly snackBar = inject(MatSnackBar);

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
    required(path.firstName, { message: 'El nombre es obligatorio' });
    required(path.lastName, { message: 'El apellido es obligatorio' });

    required(path.phone, { message: 'El celular es obligatorio' });
    minLength(path.phone, 5, { message: 'El celular debe tener al menos 5 dígitos' });
    pattern(path.phone, /^\+?[0-9\s-]+$/, {
      message: 'El celular solo puede contener números, espacios y el signo +',
    });

    // Validar de forma dinámica las respuestas requeridas de extra info
    validateTree(path.responses, (ctx) => {
      const errors: any[] = [];
      const responsesVal = ctx.value() || {};
      for (const f of this.fields()) {
        if (f.required) {
          const val = responsesVal[f.key];
          if (f.type === 'checkbox') {
            if (val !== true && val !== 'true') {
              errors.push({
                kind: 'required',
                message: `Debes marcar la casilla "${f.label}"`,
                fieldTree: (ctx.fieldTree as any)[f.key],
              });
            }
          } else {
            if (val === null || val === undefined || String(val).trim() === '') {
              errors.push({
                kind: 'required',
                message: `El campo "${f.label}" es obligatorio`,
                fieldTree: (ctx.fieldTree as any)[f.key],
              });
            }
          }
        }
      }
      return errors;
    });
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

    effect(() => {
      const err = this.error();
      if (err) {
        this.snackBar.open(err, 'Cerrar', { duration: 4000 });
      }
    });

    effect(() => {
      if (this.success()) {
        this.snackBar.open('¡Registro completado exitosamente!', 'Cerrar', { duration: 4000 });
      }
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
      .map((f) => ({
        key: f.key,
        label: f.label,
        type: (f.type as any) ?? 'text',
        required: !!f.required,
        placeholder: f.placeholder ?? null,
        options: Array.isArray(f.options) ? f.options : null,
      }));
  }

  private async init(): Promise<void> {
    this.initLoading.set(true);
    this.error.set(null);

    const fields = this.parseFields(this.event().extra_info ?? null);
    this.fields.set(fields);

    // Inicializar propiedades dinámicas del formulario en respuestas
    const initialResponses: Record<string, any> = {};
    for (const f of fields) {
      initialResponses[f.key] = f.type === 'checkbox' ? false : '';
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
    return true;
  });

  private computeStatus(): RegistrationStatus {
    return this.selectedTicketPrice() > 0 ? 'PENDING' : 'CONFIRMED';
  }

  private getInvalidFieldsList(): string[] {
    const invalidList: string[] = [];

    if (this.checkoutForm.firstName().invalid()) {
      invalidList.push('Nombre');
    }
    if (this.checkoutForm.lastName().invalid()) {
      invalidList.push('Apellido');
    }
    if (this.checkoutForm.phone().invalid()) {
      invalidList.push('Celular');
    }

    for (const f of this.fields()) {
      const fieldControl = this.checkoutForm.responses[f.key];
      if (fieldControl && fieldControl().invalid()) {
        invalidList.push(f.label);
      }
    }

    return invalidList;
  }

  async submit(): Promise<void> {
    if (!this.canSubmit()) return;
    const user = this.auth.user();
    if (!user) return;

    this.error.set(null);

    // 1. Validar formulario
    if (this.checkoutForm().invalid()) {
      this.checkoutForm().markAsTouched();
      const missing = this.getInvalidFieldsList().join(', ');
      this.error.set(`Por favor, completa o corrige los siguientes campos: ${missing}`);
      return;
    }

    // 2. Validar selección de ticket
    if (!this.selectedTicketId()) {
      this.error.set('Por favor, selecciona un pase para registrarte.');
      return;
    }

    // 3. Validar comprobante para pases de pago
    const price = this.selectedTicketPrice();
    if (price > 0 && !this.paymentProofFile()) {
      this.error.set('Por favor, sube el comprobante de pago para el pase seleccionado.');
      return;
    }

    this.submitting.set(true);

    try {
      const existing = await this.registrations.getByEventAndUser(this.event().id, user.id);
      if (existing) {
        this.alreadyRegistered.set(true);
        return;
      }

      let paymentProofUrl: string | null = null;
      if (price > 0) {
        const file = this.paymentProofFile();
        if (!file) throw new Error('Falta comprobante de pago');
        paymentProofUrl = await this.registrations.uploadPaymentProof(
          file,
          this.event().id,
          user.id,
        );
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
            Object.entries(data.responses).filter(
              ([, v]) => typeof v === 'string' && v.trim().length > 0,
            ),
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
