import { Component, OnInit, computed, effect, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  form,
  FormField as SignalFormField,
  required,
  minLength,
  pattern,
  validateTree,
} from '@angular/forms/signals';

import { AuthService } from '../../../../../../core/auth/services/auth.service';
import { FormField } from '../../../../../../models/field.model';
import { TicketType } from '../../../../../../models/ticket.model';
import type { Event as EventModel } from '../../../data/event.model';
import { RegistrationsService } from '../../data/registrations.service';

export interface StepDatosOutput {
  firstName: string;
  lastName: string;
  phone: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  responses: Record<string, any>;
  ticket: TicketType;
  paymentProofFile: File | null;
  appliedRole: 'ATTENDEE' | 'SPEAKER' | 'STAFF';
  couponId?: string | null;
}

interface CheckoutFormData {
  firstName: string;
  lastName: string;
  phone: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  responses: Record<string, any>;
}

type ExtraInfo = { form_fields?: FormField[] };

@Component({
  selector: 'app-step-datos',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    SignalFormField,
  ],
  template: `
    <div class="space-y-5 pt-2">
      <!-- Datos personales -->
      <div class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Nombre</mat-label>
            <input matInput [formField]="checkoutForm.firstName" />
            @if (checkoutForm.firstName().invalid() && checkoutForm.firstName().touched()) {
              <mat-error class="text-xs">{{ checkoutForm.firstName().errors()[0]?.message }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Apellido</mat-label>
            <input matInput [formField]="checkoutForm.lastName" />
            @if (checkoutForm.lastName().invalid() && checkoutForm.lastName().touched()) {
              <mat-error class="text-xs">{{ checkoutForm.lastName().errors()[0]?.message }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="sm:col-span-2 w-full">
            <mat-label>Celular</mat-label>
            <input matInput [formField]="checkoutForm.phone" />
            @if (checkoutForm.phone().invalid() && checkoutForm.phone().touched()) {
              <mat-error class="text-xs">{{ checkoutForm.phone().errors()[0]?.message }}</mat-error>
            }
          </mat-form-field>
        </div>
      </div>

      <hr class="border-t border-black/5" />

      <!-- Tickets -->
      <div class="space-y-3">
        <p class="text-xs font-bold text-text-primary uppercase tracking-wider m-0">
          Elegí tu pase
        </p>
        @if (tickets().length === 0) {
          <p class="text-sm text-text-secondary m-0">No hay pases disponibles por el momento.</p>
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
            @for (t of tickets(); track t.id) {
              <button
                type="button"
                class="flex flex-row sm:flex-col rounded-xl sm:rounded-2xl border overflow-hidden text-left transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer bg-white w-full p-2.5 sm:p-0"
                [class.border-google-blue]="selectedTicketId() === t.id"
                [class.shadow-md]="selectedTicketId() === t.id"
                [class.border-black\/5]="selectedTicketId() !== t.id"
                (click)="selectTicket(t)"
              >
                @if (t.image_url) {
                  <div class="hidden sm:block w-full aspect-square overflow-hidden bg-black/[0.02] shrink-0 border-b border-black/5">
                    <img [src]="t.image_url" [alt]="t.name" class="w-full h-full object-contain" />
                  </div>
                  <div class="sm:hidden w-28 h-28 rounded-xl overflow-hidden shrink-0 bg-black/[0.02] border border-black/5">
                    <img [src]="t.image_url" [alt]="t.name" class="w-full h-full object-contain" />
                  </div>
                }
                <div class="flex-grow flex flex-col justify-between w-full sm:p-3 space-y-2 pl-3">
                  <div class="text-sm font-bold text-text-primary leading-tight font-google">{{ t.name }}</div>
                  <div class="flex items-center justify-between border-t border-black/5 pt-1.5 w-full">
                    <span class="text-xs text-text-secondary">Precio</span>
                    <span class="text-google-blue font-extrabold text-xs bg-google-blue/5 px-2 py-0.5 rounded-full">
                      @if (t.price > 0) { Bs {{ t.price }} } @else { Gratis }
                    </span>
                  </div>
                </div>
              </button>
            }
          </div>
          @if (ticketError()) {
            <p class="text-xs text-google-red font-semibold m-0">{{ ticketError() }}</p>
          }
        }
      </div>

      <!-- Código de Invitación / Cupón (Oculto tras enlace por defecto) -->
      @if (!showCouponField()) {
        <div class="pt-1">
          <button
            type="button"
            class="text-xs text-google-blue font-bold hover:underline cursor-pointer bg-transparent border-0 p-0 text-left font-google"
            (click)="showCouponField.set(true)"
          >
            ¿Tenés un código de descuento o invitación?
          </button>
        </div>
      } @else {
        <div class="space-y-3">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Código de invitación / Cupón</mat-label>
            <input matInput placeholder="XXX-XXXX" (input)="onCouponInput($event)" />
            @if (couponSuccessMessage()) {
              <mat-hint class="text-google-green font-bold text-xs flex items-center gap-1 mt-1">
                <span class="material-symbols-rounded text-sm" aria-hidden="true">verified</span>
                <span>{{ couponSuccessMessage() }}</span>
              </mat-hint>
            } @else if (couponErrorMessage()) {
              <mat-hint class="text-google-red font-semibold text-xs flex items-center gap-1 mt-1">
                <span class="material-symbols-rounded text-sm" aria-hidden="true">error</span>
                <span>{{ couponErrorMessage() }}</span>
              </mat-hint>
            }
          </mat-form-field>
        </div>
      }

      <!-- Campos dinámicos -->
      @if (fields().length > 0) {
        <hr class="border-t border-black/5" />
        <div class="space-y-3">
          <p class="text-xs font-bold text-text-primary uppercase tracking-wider m-0">
            Información adicional
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            @for (f of fields(); track f.key) {
              @if (f.type === 'checkbox') {
                <div class="sm:col-span-2 space-y-1.5 py-1">
                  <div class="text-xs sm:text-sm font-semibold text-text-primary">{{ getLabel(f) }}</div>
                  <mat-checkbox [formField]="checkoutForm.responses[f.key]">
                    <span class="text-xs sm:text-sm text-text-secondary select-none font-medium">Sí, confirmo</span>
                  </mat-checkbox>
                  @if (checkoutForm.responses[f.key]().invalid() && checkoutForm.responses[f.key]().touched()) {
                    <div class="text-xs text-google-red mt-1 pl-6 font-semibold">
                      {{ checkoutForm.responses[f.key]().errors()[0]?.message }}
                    </div>
                  }
                </div>
              } @else if (f.type === 'select') {
                <mat-form-field appearance="outline" class="sm:col-span-2 w-full">
                  <mat-label>{{ getLabel(f) }}</mat-label>
                  <mat-select [formField]="checkoutForm.responses[f.key]">
                    @for (opt of f.options ?? []; track opt) {
                      <mat-option [value]="opt">{{ opt }}</mat-option>
                    }
                  </mat-select>
                  @if (checkoutForm.responses[f.key]().invalid() && checkoutForm.responses[f.key]().touched()) {
                    <mat-error class="text-xs">{{ checkoutForm.responses[f.key]().errors()[0]?.message }}</mat-error>
                  }
                </mat-form-field>
              } @else {
                <mat-form-field appearance="outline" class="sm:col-span-2 w-full">
                  <mat-label>{{ getLabel(f) }}</mat-label>
                  <input matInput [type]="f.type === 'number' ? 'number' : 'text'"
                    [formField]="checkoutForm.responses[f.key]" [placeholder]="f.placeholder ?? ''" />
                  @if (checkoutForm.responses[f.key]().invalid() && checkoutForm.responses[f.key]().touched()) {
                    <mat-error class="text-xs">{{ checkoutForm.responses[f.key]().errors()[0]?.message }}</mat-error>
                  }
                </mat-form-field>
              }
            }
          </div>
        </div>
      }

      <!-- Comprobante (solo pases de pago) -->
      @if (selectedTicketPrice() > 0) {
        <hr class="border-t border-black/5" />
        <div class="space-y-3">
          <p class="text-xs font-bold text-text-primary uppercase tracking-wider m-0">
            Comprobante de pago
          </p>
          @if (selectedTicketQrUrl()) {
            <div class="rounded-2xl border border-black/5 p-4 flex flex-col items-center gap-3 bg-white">
              <img class="w-full max-w-[220px] rounded-xl border border-black/5 object-contain"
                [src]="selectedTicketQrUrl()!" alt="QR de pago" />
              <a [href]="selectedTicketQrUrl()!" download="qr-pago.png" target="_blank"
                class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-google-blue text-google-blue hover:bg-google-blue/5 transition-all text-xs font-bold cursor-pointer no-underline active:scale-95">
                <span class="material-symbols-rounded text-sm" aria-hidden="true">download</span>
                Descargar QR
              </a>
            </div>
          }
          <input type="file" accept="image/*"
            class="text-xs w-full cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-google-blue/10 file:text-google-blue hover:file:bg-google-blue/20 bg-white border border-black/5 rounded-2xl p-2.5"
            (change)="onFileChange($event)" />
          @if (paymentProofName()) {
            <p class="text-xs text-text-secondary m-0">Archivo: <strong>{{ paymentProofName() }}</strong></p>
          }
          @if (proofError()) {
            <p class="text-xs text-google-red font-semibold m-0">{{ proofError() }}</p>
          }
        </div>
      }

      <!-- Botón continuar -->
      <div class="pt-2">
        <button
          mat-flat-button
          type="button"
          class="gdg-btn-filled w-full text-xs font-bold py-3.5 sm:py-5 rounded-xl sm:rounded-2xl"
          (click)="onContinuar()"
        >
          <span class="flex items-center justify-center gap-1.5">
            <span>Continuar</span>
            <span class="material-symbols-rounded text-sm" aria-hidden="true">chevron_right</span>
          </span>
        </button>
      </div>
    </div>
  `,
})
export class StepDatos implements OnInit {
  readonly event = input.required<EventModel>();
  readonly tickets = input.required<TicketType[]>();

  readonly stepComplete = output<StepDatosOutput>();

  private readonly auth = inject(AuthService);
  private readonly registrationsService = inject(RegistrationsService);
  private lastValidatedCode = '';

  readonly fields = signal<FormField[]>([]);
  readonly selectedTicketId = signal<string | null>(null);
  readonly selectedTicketPrice = signal(0);
  readonly selectedTicketQrUrl = signal<string | null>(null);
  readonly paymentProofFile = signal<File | null>(null);
  readonly paymentProofName = computed(() => this.paymentProofFile()?.name ?? '');

  // Lógica para códigos de invitación / cupones
  readonly showCouponField = signal(false);
  readonly couponCode = signal('');
  readonly appliedRole = signal<'ATTENDEE' | 'SPEAKER' | 'STAFF'>('ATTENDEE');
  readonly couponId = signal<string | null>(null);
  readonly couponSuccessMessage = signal<string | null>(null);
  readonly couponErrorMessage = signal<string | null>(null);
  readonly originalTicketPrice = signal(0);
  readonly ticketError = signal<string | null>(null);
  readonly proofError = signal<string | null>(null);

  readonly formData = signal<CheckoutFormData>({ firstName: '', lastName: '', phone: '', responses: {} });

  readonly checkoutForm = form(this.formData, (path) => {
    required(path.firstName, { message: 'El nombre es obligatorio' });
    required(path.lastName, { message: 'El apellido es obligatorio' });
    required(path.phone, { message: 'El celular es obligatorio' });
    minLength(path.phone, 5, { message: 'El celular debe tener al menos 5 dígitos' });
    pattern(path.phone, /^\+?[0-9\s-]+$/, { message: 'El celular solo puede contener números, espacios y el signo +' });
    validateTree(path.responses, (ctx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errors: any[] = [];
      const vals = ctx.value() ?? {};
      for (const f of this.fields()) {
        if (!f.required) continue;
        const val = (vals as Record<string, unknown>)[f.key];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fieldTree = (ctx.fieldTree as Record<string, any>)[f.key];
        if (f.type === 'checkbox') {
          if (val !== true)
            errors.push({ kind: 'required', message: `Debes marcar la casilla "${f.label}"`, fieldTree });
        } else {
          if (val === null || val === undefined || String(val).trim() === '')
            errors.push({ kind: 'required', message: `El campo "${f.label}" es obligatorio`, fieldTree });
        }
      }
      return errors;
    });
  });

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (!user) return;
      this.formData.update((prev) => ({
        ...prev,
        firstName: prev.firstName || (user.first_name ?? ''),
        lastName: prev.lastName || (user.last_name ?? ''),
        phone: prev.phone || (user.phone ?? ''),
      }));
    });
  }

  ngOnInit(): void {
    const parsed = this.parseFields(this.event().extra_info ?? null);
    this.fields.set(parsed);
    const initialResponses: Record<string, unknown> = {};
    for (const f of parsed) initialResponses[f.key] = f.type === 'checkbox' ? false : '';
    this.formData.update((prev) => ({ ...prev, responses: initialResponses }));
  }

  selectTicket(t: TicketType): void {
    const price = Number(t.price ?? 0);
    this.selectedTicketId.set(t.id);
    this.originalTicketPrice.set(price);
    
    // Si ya se aplicó un código de invitación, el costo del pase es cero
    if (this.appliedRole() !== 'ATTENDEE') {
      this.selectedTicketPrice.set(0);
    } else {
      this.selectedTicketPrice.set(price);
    }
    
    this.selectedTicketQrUrl.set(t.payment_qr_url ?? null);
    this.paymentProofFile.set(null);
    this.ticketError.set(null);
    this.proofError.set(null);
  }

  async onCouponInput(event: Event): Promise<void> {
    const code = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.couponCode.set(code);
    this.lastValidatedCode = code;

    if (!code) {
      this.appliedRole.set('ATTENDEE');
      this.couponId.set(null);
      this.selectedTicketPrice.set(this.originalTicketPrice());
      this.couponSuccessMessage.set(null);
      this.couponErrorMessage.set(null);
      return;
    }

    // Debounce de 250ms
    await new Promise(resolve => setTimeout(resolve, 250));
    if (this.lastValidatedCode !== code) return;

    const res = await this.registrationsService.validateCoupon(this.event().id, code);
    
    // Evitar condición de carrera si el usuario continuó escribiendo durante la petición HTTP
    if (this.lastValidatedCode !== code) return;

    if (!res) {
      this.appliedRole.set('ATTENDEE');
      this.couponId.set(null);
      this.selectedTicketPrice.set(this.originalTicketPrice());
      this.couponSuccessMessage.set(null);
      this.couponErrorMessage.set('Código de invitación no válido o expirado.');
      return;
    }

    if (!res.valid) {
      this.appliedRole.set('ATTENDEE');
      this.couponId.set(null);
      this.selectedTicketPrice.set(this.originalTicketPrice());
      this.couponSuccessMessage.set(null);
      this.couponErrorMessage.set(res.error ?? 'Código de invitación no válido o expirado.');
    } else {
      this.appliedRole.set(res.role ?? 'ATTENDEE');
      this.couponId.set(res.id ?? null);
      this.selectedTicketPrice.set(0);

      const roleLabel = res.role === 'SPEAKER' ? 'Speaker' : res.role === 'STAFF' ? 'Staff' : 'Asistente';
      this.couponSuccessMessage.set(`Código de invitación de ${roleLabel} aplicado (100% de descuento).`);
      this.couponErrorMessage.set(null);
    }
  }

  onFileChange(event: globalThis.Event): void {
    const file = (event.target as HTMLInputElement | null)?.files?.item(0) ?? null;
    this.paymentProofFile.set(file);
    this.proofError.set(null);
  }

  onContinuar(): void {
    if (this.checkoutForm().invalid()) {
      this.checkoutForm().markAsTouched();
      return;
    }
    if (!this.selectedTicketId()) {
      this.ticketError.set('Por favor, seleccioná un pase para continuar.');
      return;
    }
    if (this.selectedTicketPrice() > 0 && !this.paymentProofFile()) {
      this.proofError.set('Por favor, subí el comprobante de pago.');
      return;
    }
    const ticket = this.tickets().find((t) => t.id === this.selectedTicketId())!;
    const data = this.formData();
    this.stepComplete.emit({
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      phone: data.phone.trim(),
      responses: data.responses,
      ticket,
      paymentProofFile: this.paymentProofFile(),
      appliedRole: this.appliedRole(),
      couponId: this.couponId(),
    });
  }

  getLabel(field: FormField): string {
    if (field.required) return field.label.endsWith(' *') ? field.label : `${field.label} *`;
    return field.label.toLowerCase().includes('opcional') ? field.label : `${field.label} (opcional)`;
  }

  private parseFields(extraInfo: unknown): FormField[] {
    let normalized = extraInfo;
    if (typeof normalized === 'string') {
      try { normalized = JSON.parse(normalized); } catch { return []; }
    }
    const fields = (normalized as ExtraInfo | null)?.form_fields;
    if (!Array.isArray(fields)) return [];
    return fields
      .filter((f) => typeof f?.key === 'string' && typeof f?.label === 'string')
      .map((f) => ({
        key: f.key,
        label: f.label,
        type: (f.type as FormField['type']) ?? 'text',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        required: (f as any).required === true || (f as any).required === 'true',
        placeholder: f.placeholder ?? null,
        options: Array.isArray(f.options) ? f.options : null,
      }));
  }
}
