import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  form,
  FormField as SignalFormField,
  maxLength,
  required,
  validate,
  validateTree,
} from '@angular/forms/signals';

import { AuthService } from '../../../../../../core/auth/services/auth.service';
import { FormField } from '../../../../../../models/field.model';
import { EventRole } from '../../../../../../models/registration.model';
import { TicketType } from '../../../../../../models/ticket.model';
import type { Event as EventModel } from '../../../data/event.model';
import { isValidPhone, normalizePhone } from '../../data/phone';
import { RegistrationsService } from '../../data/registrations.service';
import { getSoldOutPhases, lowStockRemaining } from '../../data/ticket-availability';
import { MissingFieldsDialog } from './missing-fields-dialog';

export interface StepDatosOutput {
  firstName: string;
  lastName: string;
  phone: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  responses: Record<string, any>;
  ticket: TicketType;
  paymentProofFile: File | null;
  appliedRole: EventRole;
  couponId?: string | null;
}

interface CheckoutFormData {
  firstName: string;
  lastName: string;
  phone: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  responses: Record<string, any>;
}

interface ExtraInfo {
  form_fields?: FormField[];
}

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
            <mat-label>Nombres</mat-label>
            <input
              matInput
              [formField]="checkoutForm.firstName"
              data-field="firstName"
              placeholder="Ej: Juan Carlos"
              autocomplete="given-name"
            />
            @if (checkoutForm.firstName().invalid() && checkoutForm.firstName().touched()) {
              <mat-error class="text-xs">{{
                checkoutForm.firstName().errors()[0]?.message
              }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Apellidos</mat-label>
            <input
              matInput
              [formField]="checkoutForm.lastName"
              data-field="lastName"
              placeholder="Ej: Pérez Gutiérrez"
              autocomplete="family-name"
            />
            @if (checkoutForm.lastName().invalid() && checkoutForm.lastName().touched()) {
              <mat-error class="text-xs">{{
                checkoutForm.lastName().errors()[0]?.message
              }}</mat-error>
            }
          </mat-form-field>

          <p class="sm:col-span-2 -mt-2 mb-1 text-xs text-text-secondary">
            Escríbelos tal como quieres que aparezcan en tu certificado.
          </p>

          <mat-form-field appearance="outline" class="sm:col-span-2 w-full">
            <mat-label>Celular</mat-label>
            <input
              matInput
              [formField]="checkoutForm.phone"
              data-field="phone"
              type="tel"
              inputmode="tel"
              autocomplete="tel"
            />
            <mat-hint>Ej. 71234567</mat-hint>
            @if (checkoutForm.phone().invalid() && checkoutForm.phone().touched()) {
              <mat-error class="text-xs">{{ checkoutForm.phone().errors()[0]?.message }}</mat-error>
            }
          </mat-form-field>
        </div>
      </div>

      <hr class="border-t border-black/5" />

      <!-- Tickets -->
      <div class="space-y-3" data-field="ticket" tabindex="-1">
        <p class="text-sm font-bold text-text-primary m-0">Elige tu entrada</p>
        @if (tickets().length === 0) {
          <p class="text-sm text-text-secondary m-0">No hay entradas disponibles por el momento.</p>
        } @else {
          <div
            class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5"
            role="radiogroup"
            aria-label="Entradas"
          >
            @for (t of tickets(); track t.id) {
              <button
                type="button"
                role="radio"
                [attr.aria-checked]="selectedTicketId() === t.id"
                class="flex flex-row sm:flex-col rounded-xl sm:rounded-2xl border overflow-hidden text-left transition-[transform,box-shadow,border-color] duration-200 ease-out-strong bg-white w-full p-2.5 sm:p-0"
                [class]="
                  t.sold_out
                    ? 'cursor-not-allowed opacity-60'
                    : 'cursor-pointer hover:-translate-y-0.5 motion-safe:active:scale-[0.97]'
                "
                [class.border-google-blue]="selectedTicketId() === t.id"
                [class.shadow-md]="selectedTicketId() === t.id"
                [class.border-black/5]="selectedTicketId() !== t.id"
                [disabled]="t.sold_out"
                [attr.aria-disabled]="t.sold_out ? 'true' : null"
                (click)="selectTicket(t)"
              >
                @if (t.image_url) {
                  <div
                    class="hidden sm:block w-full aspect-square overflow-hidden bg-black/[0.02] shrink-0 border-b border-black/5"
                  >
                    <img [src]="t.image_url" [alt]="t.name" class="w-full h-full object-contain" />
                  </div>
                  <div
                    class="sm:hidden w-28 h-28 rounded-xl overflow-hidden shrink-0 bg-black/[0.02] border border-black/5"
                  >
                    <img [src]="t.image_url" [alt]="t.name" class="w-full h-full object-contain" />
                  </div>
                }
                <div class="flex-grow flex flex-col justify-between w-full sm:p-3 space-y-2 pl-3">
                  <div class="text-sm font-bold text-text-primary leading-tight font-google">
                    {{ t.name }}
                  </div>
                  @if (t.description) {
                    <p
                      class="m-0 text-xs text-text-secondary leading-snug whitespace-pre-line"
                      [class.line-clamp-3]="!!t.image_url"
                    >
                      {{ t.description }}
                    </p>
                  }
                  @for (p of soldOutPhases(t); track p.id) {
                    <div class="flex items-center justify-between w-full text-xs text-text-muted">
                      <span class="line-through"
                        >{{ p.name }} ·
                        @if (p.price > 0) {
                          Bs {{ p.price }}
                        } @else {
                          Gratis
                        }
                      </span>
                      <span class="font-bold text-google-red">Agotada</span>
                    </div>
                  }
                  <div
                    class="flex items-center justify-between border-t border-black/5 pt-1.5 w-full gap-2"
                  >
                    <span class="text-xs text-text-secondary">
                      {{ t.active_phase ? t.active_phase.name : 'Precio' }}
                    </span>
                    @if (t.sold_out) {
                      <span
                        class="text-google-red font-extrabold text-xs bg-google-red/5 px-2 py-0.5 rounded-full"
                        >Agotado</span
                      >
                    } @else {
                      <span
                        class="text-google-blue font-extrabold text-xs bg-google-blue/5 px-2 py-0.5 rounded-full"
                      >
                        @if (t.price > 0) {
                          Bs {{ t.price }}
                        } @else {
                          Gratis
                        }
                      </span>
                    }
                  </div>
                  @if (lowStock(t); as left) {
                    <p class="m-0 text-xs font-bold text-google-red">¡Quedan {{ left }}!</p>
                  }
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
            ¿Tienes un código de descuento o invitación?
          </button>
        </div>
      } @else {
        <div class="space-y-3">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Código de invitación / Cupón</mat-label>
            <input
              matInput
              class="uppercase"
              placeholder="XXX-XXXX"
              (input)="onCouponInput($event)"
            />
            <mat-hint role="status">
              @if (couponChecking()) {
                <span class="text-text-secondary text-xs mt-1">Verificando código…</span>
              } @else if (couponSuccessMessage()) {
                <span class="text-google-green font-bold text-xs flex items-center gap-1 mt-1">
                  <span class="material-symbols-rounded text-sm" aria-hidden="true">verified</span>
                  <span>{{ couponSuccessMessage() }}</span>
                </span>
              } @else if (couponErrorMessage()) {
                <span class="text-google-red font-semibold text-xs flex items-center gap-1 mt-1">
                  <span class="material-symbols-rounded text-sm" aria-hidden="true">error</span>
                  <span>{{ couponErrorMessage() }}</span>
                </span>
              }
            </mat-hint>
          </mat-form-field>
        </div>
      }

      <!-- Campos dinámicos -->
      @if (fields().length > 0) {
        <hr class="border-t border-black/5" />
        <div class="space-y-3">
          <p class="text-sm font-bold text-text-primary m-0">Información adicional</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            @for (f of fields(); track f.key) {
              @if (f.type === 'checkbox') {
                <div
                  class="sm:col-span-2 space-y-1.5 py-1"
                  [attr.data-field]="'r-' + f.key"
                  tabindex="-1"
                >
                  <div class="text-xs sm:text-sm font-semibold text-text-primary">
                    {{ getLabel(f) }}
                  </div>
                  <mat-checkbox [formField]="checkoutForm.responses[f.key]">
                    <span class="text-xs sm:text-sm text-text-secondary select-none font-medium"
                      >Sí, confirmo</span
                    >
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
                    [attr.data-field]="'r-' + f.key"
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
                    type="text"
                    [attr.inputmode]="f.type === 'number' ? 'numeric' : null"
                    [attr.data-field]="'r-' + f.key"
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
      }

      <!-- Comprobante (solo entradas de pago) -->
      @if (selectedTicketPrice() > 0) {
        <hr class="border-t border-black/5" />
        <div class="space-y-3">
          <p class="text-sm font-bold text-text-primary m-0">Comprobante de pago</p>
          @if (selectedTicketQrUrl()) {
            <div
              class="rounded-2xl border border-black/5 p-4 flex flex-col items-center gap-3 bg-white"
            >
              <img
                class="w-full max-w-[220px] rounded-xl border border-black/5 object-contain"
                [src]="selectedTicketQrUrl()!"
                alt="QR de pago"
              />
              <a
                [href]="selectedTicketQrUrl()!"
                download="qr-pago.png"
                target="_blank"
                class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-google-blue text-google-blue hover:bg-google-blue/5 transition-[background-color,transform] duration-150 ease-out-strong text-xs font-bold cursor-pointer no-underline motion-safe:active:scale-[0.97]"
              >
                <span class="material-symbols-rounded text-sm" aria-hidden="true">download</span>
                Descargar QR
              </a>
            </div>
          }
          <p class="text-xs text-text-secondary m-0">Foto o captura del comprobante</p>
          <input
            type="file"
            data-field="proof"
            aria-label="Comprobante de pago (imagen)"
            accept="image/*"
            class="text-xs w-full cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-google-blue/10 file:text-google-blue hover:file:bg-google-blue/20 bg-white border border-black/5 rounded-2xl p-2.5"
            (change)="onFileChange($event)"
          />
          @if (paymentProofName()) {
            <p class="text-xs text-text-secondary m-0">
              Archivo: <strong>{{ paymentProofName() }}</strong>
            </p>
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
          class="gdg-btn-filled w-full text-xs font-bold py-3.5 sm:py-5 rounded-full"
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
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private lastValidatedCode = '';
  private lastTicketKey: string | null = null;

  readonly fields = signal<FormField[]>([]);
  readonly selectedTicketId = signal<string | null>(null);
  // Precio/QR salen del paquete elegido (fase activa); se recalculan si cambia la disponibilidad.
  readonly selectedTicket = computed(
    () => this.tickets().find((t) => t.id === this.selectedTicketId()) ?? null,
  );
  readonly originalTicketPrice = computed(() => Number(this.selectedTicket()?.price ?? 0));
  readonly selectedTicketPrice = computed(() => (this.couponId() ? 0 : this.originalTicketPrice()));
  readonly selectedTicketQrUrl = computed(() => this.selectedTicket()?.payment_qr_url ?? null);
  readonly paymentProofFile = signal<File | null>(null);
  readonly paymentProofName = computed(() => this.paymentProofFile()?.name ?? '');

  // Lógica para códigos de invitación / cupones
  readonly showCouponField = signal(false);
  readonly couponCode = signal('');
  readonly appliedRole = signal<EventRole>('ATTENDEE');
  readonly couponId = signal<string | null>(null);
  readonly couponSuccessMessage = signal<string | null>(null);
  readonly couponErrorMessage = signal<string | null>(null);
  readonly couponChecking = signal(false);
  readonly ticketError = signal<string | null>(null);
  readonly proofError = signal<string | null>(null);

  readonly formData = signal<CheckoutFormData>({
    firstName: '',
    lastName: '',
    phone: '',
    responses: {},
  });

  readonly checkoutForm = form(this.formData, (path) => {
    // required() deja pasar "   ", por eso el nombre se valida recortado.
    const name = (empty: string) => (ctx: { value: () => string }) =>
      ctx.value().trim().length < 2 ? { kind: 'required', message: empty } : undefined;
    validate(path.firstName, name('Escribe tus nombres'));
    validate(path.lastName, name('Escribe tus apellidos'));
    maxLength(path.firstName, 60, { message: 'Máximo 60 caracteres' });
    maxLength(path.lastName, 60, { message: 'Máximo 60 caracteres' });
    required(path.phone, { message: 'Ingresa tu celular' });
    validate(path.phone, (ctx) =>
      ctx.value() && !isValidPhone(ctx.value())
        ? {
            kind: 'phone',
            message:
              'Ingresa un celular de 8 dígitos, ej. 71234567. Si es de otro país, empieza con + y el código.',
          }
        : undefined,
    );
    validateTree(path.responses, (ctx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errors: any[] = [];
      const vals = ctx.value() ?? {};
      for (const f of this.fields()) {
        const val = (vals as Record<string, unknown>)[f.key];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fieldTree = (ctx.fieldTree as Record<string, any>)[f.key];
        if (f.type === 'number' && val && !/^\d+$/.test(String(val)))
          errors.push({ kind: 'pattern', message: 'Solo números', fieldTree });
        if (!f.required) continue;
        if (f.type === 'checkbox') {
          if (val !== true)
            errors.push({
              kind: 'required',
              message: `Debes marcar la casilla "${f.label}"`,
              fieldTree,
            });
        } else {
          if (val === null || val === undefined || String(val).trim() === '')
            errors.push({
              kind: 'required',
              message: `El campo "${f.label}" es obligatorio`,
              fieldTree,
            });
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

    // Si el evento tiene una sola entrada disponible, se selecciona por defecto.
    effect(() => {
      const tickets = this.tickets();
      if (tickets.length !== 1 || this.selectedTicketId() || tickets[0].sold_out) return;
      untracked(() => this.selectTicket(tickets[0]));
    });

    // Si la disponibilidad cambia (se agotó la fase elegida), el comprobante ya no corresponde.
    effect(() => {
      const ticket = this.selectedTicket();
      const key = ticket ? `${ticket.id}:${ticket.active_phase?.id ?? ''}:${ticket.price}` : null;
      untracked(() => {
        if (ticket?.sold_out) {
          this.selectedTicketId.set(null);
          this.ticketError.set(`«${ticket.name}» se agotó. Elige otra entrada.`);
        }
        if (key !== this.lastTicketKey) {
          this.lastTicketKey = key;
          this.paymentProofFile.set(null);
          this.proofError.set(null);
        }
      });
    });
  }

  ngOnInit(): void {
    const parsed = this.parseFields(this.event().extra_info ?? null);
    this.fields.set(parsed);
    const initialResponses: Record<string, unknown> = {};
    for (const f of parsed) initialResponses[f.key] = f.type === 'checkbox' ? false : '';
    this.formData.update((prev) => ({ ...prev, responses: initialResponses }));
  }

  soldOutPhases(t: TicketType) {
    return t.sold_out ? [] : getSoldOutPhases(t);
  }

  lowStock(t: TicketType): number | null {
    return lowStockRemaining(t);
  }

  selectTicket(t: TicketType): void {
    if (t.sold_out) return;
    this.selectedTicketId.set(t.id);
    this.paymentProofFile.set(null);
    this.ticketError.set(null);
    this.proofError.set(null);
  }

  async onCouponInput(event: Event): Promise<void> {
    const code = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.couponCode.set(code);
    this.lastValidatedCode = code;

    if (!code) {
      this.couponChecking.set(false);
      this.appliedRole.set('ATTENDEE');
      this.couponId.set(null);
      this.couponSuccessMessage.set(null);
      this.couponErrorMessage.set(null);
      return;
    }

    // Debounce de 250ms
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (this.lastValidatedCode !== code) return;

    this.couponChecking.set(true);
    const res = await this.registrationsService.validateCoupon(this.event().id, code);

    // Evitar condición de carrera si el usuario continuó escribiendo durante la petición HTTP
    if (this.lastValidatedCode !== code) return;
    this.couponChecking.set(false);

    if (!res) {
      this.appliedRole.set('ATTENDEE');
      this.couponId.set(null);
      this.couponSuccessMessage.set(null);
      this.couponErrorMessage.set('Código de invitación no válido o expirado.');
      return;
    }

    if (!res.valid) {
      this.appliedRole.set('ATTENDEE');
      this.couponId.set(null);
      this.couponSuccessMessage.set(null);
      this.couponErrorMessage.set(res.error ?? 'Código de invitación no válido o expirado.');
    } else {
      this.appliedRole.set(res.role ?? 'ATTENDEE');
      this.couponId.set(res.id ?? null);

      const roleLabel =
        res.role === 'SPEAKER'
          ? 'Speaker'
          : res.role === 'STAFF'
            ? 'Staff'
            : res.role === 'SPONSOR'
              ? 'Sponsor'
              : 'Asistente';
      this.couponSuccessMessage.set(
        `Código de invitación de ${roleLabel} aplicado (100% de descuento).`,
      );
      this.couponErrorMessage.set(null);
    }
  }

  onFileChange(event: globalThis.Event): void {
    const file = (event.target as HTMLInputElement | null)?.files?.item(0) ?? null;
    this.paymentProofFile.set(file);
    this.proofError.set(null);
  }

  /**
   * Marca todos los campos como tocados (así cada uno muestra su error) y devuelve los mensajes
   * de lo que falta. markAsTouched() sobre la raíz no alcanza a los campos hijos.
   */
  private collectMissing(): string[] {
    const messages: string[] = [];
    const form = this.checkoutForm;
    for (const field of [form.firstName, form.lastName, form.phone]) {
      field().markAsTouched();
      if (field().invalid()) messages.push(field().errors()[0]?.message ?? 'Revisa este campo');
    }
    for (const f of this.fields()) {
      const state = form.responses[f.key]();
      state.markAsTouched();
      if (state.invalid()) messages.push(state.errors()[0]?.message ?? `Revisa "${f.label}"`);
    }
    return messages;
  }

  private showMissing(messages: string[]): void {
    this.dialog
      .open(MissingFieldsDialog, {
        data: { messages },
        autoFocus: 'dialog',
        width: 'min(92vw, 28rem)',
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.focusFirstInvalid());
  }

  /** Primer dato pendiente en orden visual: personales, entrada, extras, comprobante. */
  private focusFirstInvalid(): void {
    const form = this.checkoutForm;
    const key =
      (['firstName', 'lastName', 'phone'] as const).find((k) => form[k]().invalid()) ??
      (this.ticketError() ? 'ticket' : null) ??
      null;
    const target =
      key ??
      (() => {
        const extra = this.fields().find((f) => form.responses[f.key]().invalid());
        if (extra) return `r-${extra.key}`;
        return this.proofError() ? 'proof' : null;
      })();
    if (!target) return;
    const el = this.host.nativeElement.querySelector<HTMLElement>(`[data-field="${target}"]`);
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    el.focus({ preventScroll: true });
  }

  onContinuar(): void {
    const messages = this.collectMissing();
    if (!this.selectedTicketId()) {
      this.ticketError.set('Selecciona una entrada para continuar.');
      messages.push('Elige una entrada.');
    }
    if (this.selectedTicketId() && this.selectedTicketPrice() > 0 && !this.paymentProofFile()) {
      this.proofError.set('Sube el comprobante de pago.');
      messages.push('Sube el comprobante de pago.');
    }
    if (messages.length > 0) {
      this.showMissing(messages);
      return;
    }
    const ticket = this.tickets().find((t) => t.id === this.selectedTicketId())!;
    const data = this.formData();
    this.stepComplete.emit({
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      phone: normalizePhone(data.phone),
      responses: data.responses,
      ticket,
      paymentProofFile: this.paymentProofFile(),
      appliedRole: this.appliedRole(),
      couponId: this.couponId(),
    });
  }

  getLabel(field: FormField): string {
    if (field.required) return field.label.endsWith(' *') ? field.label : `${field.label} *`;
    return field.label.toLowerCase().includes('opcional')
      ? field.label
      : `${field.label} (opcional)`;
  }

  private parseFields(extraInfo: unknown): FormField[] {
    let normalized = extraInfo;
    if (typeof normalized === 'string') {
      try {
        normalized = JSON.parse(normalized);
      } catch {
        return [];
      }
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
