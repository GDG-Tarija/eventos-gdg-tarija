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
import { SessionWithTrack } from '../../../../../core/models/session.model';
import { SbSessions } from '../../../../../core/services/supabase/sb-sessions';
import { FormField } from '../../../../../models/field.model';
import { RegistrationPayload, RegistrationStatus } from '../../../../../models/registration.model';
import { TicketType } from '../../../../../models/ticket.model';
import type { Event as EventModel } from '../../data/event.model';
import { RegistrationsService } from '../data/registrations.service';
import { TicketTypesService } from '../data/ticket-types.service';
import { UserProfileService } from '../data/user-profile.service';
import { SessionPicker } from './session-picker/session-picker';

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
    SessionPicker,
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
            <div class="flex items-center gap-2 pb-2 border-b border-black/5">
              <span class="material-symbols-rounded text-base text-google-blue" aria-hidden="true"
                >person</span
              >
              <h3 class="text-xs font-bold text-text-primary uppercase tracking-wider m-0">
                Tus datos
              </h3>
            </div>

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

          <hr class="border-t border-black/5 my-4" />

          <!-- Paso 2: Tickets -->
          <div class="space-y-4">
            <div class="flex items-center gap-2 pb-2 border-b border-black/5">
              <span class="material-symbols-rounded text-base text-google-blue" aria-hidden="true"
                >confirmation_number</span
              >
              <h3 class="text-xs font-bold text-text-primary uppercase tracking-wider m-0">
                Elegí tu pase
              </h3>
            </div>

            <div class="space-y-3">
              @if (tickets().length === 0) {
                <p class="text-sm text-text-secondary m-0">
                  No hay pases disponibles por el momento.
                </p>
              } @else {
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
                  @for (t of tickets(); track t.id) {
                    <button
                      type="button"
                      class="flex flex-row sm:flex-col rounded-xl sm:rounded-2xl border overflow-hidden text-left transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer bg-white w-full p-2.5 sm:p-0"
                      [class.border-google-blue]="selectedTicketId() === t.id"
                      [class.bg-google-blue/[0.01]]="selectedTicketId() === t.id"
                      [class.shadow-md]="selectedTicketId() === t.id"
                      [class.border-black/5]="selectedTicketId() !== t.id"
                      [class.hover:shadow-sm]="selectedTicketId() !== t.id"
                      [class.hover:border-black/10]="selectedTicketId() !== t.id"
                      (click)="selectTicket(t)"
                    >
                      <!-- 1. Imagen para Desktop: en la parte superior, ocupa todo el ancho de la tarjeta -->
                      @if (t.image_url) {
                        <div class="hidden sm:block w-full aspect-square overflow-hidden bg-black/[0.02] relative shrink-0 border-b border-black/5">
                          <img
                            [src]="t.image_url"
                            [alt]="t.name"
                            class="w-full h-full object-contain transition-transform duration-500 ease-in-out hover:scale-105"
                          />
                        </div>
                      }

                      <!-- 2. Imagen para Mobile: miniatura destacada a la izquierda (128px) -->
                      @if (t.image_url) {
                        <div class="sm:hidden w-32 h-32 rounded-2xl overflow-hidden shrink-0 bg-black/[0.02] border border-black/5">
                          <img
                            [src]="t.image_url"
                            [alt]="t.name"
                            class="w-full h-full object-contain"
                          />
                        </div>
                      }

                      <!-- Contenido de texto y métricas -->
                      <div class="flex-grow min-w-0 flex flex-col justify-between w-full sm:p-4 sm:space-y-3 pl-4">
                        <div class="space-y-1">
                          <div class="text-sm sm:text-base font-bold text-text-primary leading-tight font-google line-clamp-2">
                            {{ t.name }}
                          </div>
                          <div class="text-xs sm:text-xs text-text-secondary flex items-center gap-1 font-medium">
                            <span class="material-symbols-rounded text-xs sm:text-sm text-text-muted" aria-hidden="true">group</span>
                            <span>Cupo: {{ t.ticket_capacity }}</span>
                          </div>
                        </div>

                        <!-- Barra de precio inferior integrada -->
                        <div class="flex items-center justify-between pt-1 sm:pt-2 border-t border-black/5 w-full">
                          <span class="text-xs sm:text-xs text-text-secondary font-medium">Precio</span>
                          <span class="text-google-blue font-extrabold text-xs sm:text-sm bg-google-blue/5 px-2.5 py-0.5 rounded-full shrink-0">
                            @if (t.price > 0) {
                              Bs {{ t.price }}
                            } @else {
                              Gratis
                            }
                          </span>
                        </div>
                      </div>
                    </button>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Paso 3: Sesiones -->
          @if (hasSessions()) {
            <hr class="border-t border-black/5 my-4" />

            <div class="space-y-4">
              <div class="flex items-center gap-2 pb-2 border-b border-black/5">
                <span class="material-symbols-rounded text-base text-google-blue" aria-hidden="true">event_seat</span>
                <h3 class="text-xs font-bold text-text-primary uppercase tracking-wider m-0">
                  Elige tus sesiones
                </h3>
              </div>
              <p class="text-xs text-text-secondary m-0 -mt-1">
                Podés inscribirte a una sesión por bloque horario. No es posible asistir a dos sesiones simultáneas.
              </p>
              <app-session-picker
                [sessions]="sessions()"
                [(selectedIds)]="selectedSessionIds"
                (selectionChange)="selectedSessionIds.set($event)"
              />
            </div>
          }

          <!-- Paso 4: Preguntas dinámicas -->
          @if (fields().length > 0) {
            <hr class="border-t border-black/5 my-4" />

            <div class="space-y-4">
              <div class="flex items-center gap-2 pb-2 border-b border-black/5">
                <span class="material-symbols-rounded text-base text-google-blue" aria-hidden="true"
                  >assignment</span
                >
                <h3 class="text-xs font-bold text-text-primary uppercase tracking-wider m-0">
                  Información adicional
                </h3>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                @for (f of fields(); track f.key) {
                  @if (f.type === 'checkbox') {
                    <div class="sm:col-span-2 space-y-1.5 py-1">
                      <div class="text-xs sm:text-sm font-semibold text-text-primary leading-snug">
                        {{ getLabel(f) }}
                      </div>
                      <mat-checkbox [formField]="checkoutForm.responses[f.key]">
                        <span
                          class="text-xs sm:text-sm text-text-secondary select-none font-medium"
                        >
                          Sí, confirmo
                        </span>
                      </mat-checkbox>
                      @if (
                        checkoutForm.responses[f.key]().invalid() &&
                        checkoutForm.responses[f.key]().touched()
                      ) {
                        <div class="text-xs text-google-red mt-1 pl-6 font-semibold">
                          {{ checkoutForm.responses[f.key]().errors()[0]?.message }}
                        </div>
                      }
                    </div>
                  } @else if (f.type === 'select') {
                    <mat-form-field appearance="outline" class="sm:col-span-2 w-full">
                      <mat-label>{{ getLabel(f) }}</mat-label>
                      <mat-select
                        [formField]="checkoutForm.responses[f.key]"
                        [placeholder]="getPlaceholder(f)"
                      >
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
                      <mat-label>{{ getLabel(f) }}</mat-label>
                      <input
                        matInput
                        [type]="f.type === 'number' ? 'number' : 'text'"
                        [formField]="checkoutForm.responses[f.key]"
                        [placeholder]="getPlaceholder(f)"
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
          }

          <!-- Comprobante (solo pagos) -->
          @if (selectedTicketPrice() > 0) {
            <hr class="border-t border-black/5 my-4" />

            <div class="space-y-4">
              <div class="flex items-center gap-2 pb-2 border-b border-black/5">
                <span class="material-symbols-rounded text-base text-google-blue" aria-hidden="true"
                  >payments</span
                >
                <h3 class="text-xs font-bold text-text-primary uppercase tracking-wider m-0">
                  Comprobante de pago
                </h3>
              </div>

              <div class="space-y-3">
                @if (selectedTicketQrUrl()) {
                  <div class="rounded-2xl border border-black/5 p-4 space-y-3 bg-white flex flex-col items-center">
                    <div class="flex justify-center">
                      <img
                        class="w-full max-w-[260px] rounded-xl border border-black/5 bg-white object-contain"
                        [src]="selectedTicketQrUrl()!"
                        alt="QR de pago"
                      />
                    </div>
                    <a
                      [href]="selectedTicketQrUrl()!"
                      download="qr-pago.png"
                      target="_blank"
                      class="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full border border-google-blue text-google-blue hover:bg-google-blue/5 transition-all duration-200 text-xs font-bold cursor-pointer no-underline active:scale-95"
                    >
                      <span class="material-symbols-rounded text-sm" aria-hidden="true">download</span>
                      <span>Descargar QR</span>
                    </a>
                  </div>
                }

                <div class="pt-1">
                  <input
                    type="file"
                    accept="image/*"
                    class="text-xs w-full cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-google-blue/10 file:text-google-blue hover:file:bg-google-blue/20 bg-white border border-black/5 rounded-2xl p-2.5"
                    (change)="onFileChange($event)"
                  />
                </div>
                @if (paymentProofName()) {
                  <p class="text-xs text-text-secondary m-0">
                    Archivo: <strong>{{ paymentProofName() }}</strong>
                  </p>
                }
              </div>
            </div>
          }

          <div class="pt-2">
            <button
              mat-flat-button
              type="button"
              class="gdg-btn-filled w-full text-xs font-bold py-3.5 sm:py-5 rounded-xl sm:rounded-2xl"
              [disabled]="!canSubmit()"
              (click)="submit()"
            >
              <span class="flex items-center justify-center gap-1.5 w-full h-full">
                @if (submitting()) {
                  <span>Registrando...</span>
                } @else {
                  <span>Confirmar registro</span>
                  <span class="material-symbols-rounded text-sm" aria-hidden="true"
                    >chevron_right</span
                  >
                }
              </span>
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
  private readonly sbSessions = inject(SbSessions);
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

  readonly sessions = signal<SessionWithTrack[]>([]);
  readonly selectedSessionIds = signal<string[]>([]);
  readonly hasSessions = computed(() => this.sessions().length > 0);

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
        required: (f as any).required === true || (f as any).required === 'true',
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

      // Sesiones: carga no-fatal — si la migración aún no se aplicó, el checkout sigue funcionando
      try {
        const sessionList = await this.sbSessions.listByEvent(this.event().id);
        this.sessions.set(sessionList);
      } catch {
        this.sessions.set([]);
      }

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
      const newRegistration = await this.registrations.createRegistration(payload.registration);

      if (newRegistration && this.selectedSessionIds().length > 0) {
        await this.sbSessions.saveSessionRegistrations(newRegistration.id, this.selectedSessionIds());
      }

      this.success.set(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : `Error al registrar: ${String(e)}`;
      this.error.set(msg);
    } finally {
      this.submitting.set(false);
    }
  }

  getLabel(field: FormField): string {
    const label = field.label;
    if (field.required) {
      return label.endsWith(' *') ? label : `${label} *`;
    } else {
      const hasOpcional = label.toLowerCase().includes('opcional');
      return hasOpcional ? label : `${label} (opcional)`;
    }
  }

  getPlaceholder(field: FormField): string {
    const placeholder = field.placeholder ?? '';
    if (!placeholder) return '';
    if (field.required) {
      return placeholder;
    } else {
      // Strip redundant "(opcional)" or "opcional" from the input placeholder
      return placeholder.replace(/\s*\(?opcional\)?/gi, '').trim();
    }
  }
}
