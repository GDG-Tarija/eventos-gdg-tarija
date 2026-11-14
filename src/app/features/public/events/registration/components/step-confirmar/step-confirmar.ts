import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { SessionWithTrack } from '../../../../../../core/models/session.model';
import type { RegistrationStatus } from '../../../../../../models/registration.model';
import type { StepDatosOutput } from '../step-datos/step-datos';

@Component({
  selector: 'app-step-confirmar',
  standalone: true,
  imports: [MatButtonModule],
  template: `
    <div class="space-y-5 pt-2">
      <!-- Resumen -->
      <div class="rounded-2xl border border-black/5 bg-white p-4 space-y-4">
        <!-- Datos personales -->
        <div class="space-y-1.5">
          <p class="text-xs font-bold text-text-secondary m-0">Asistente</p>
          @if (step1Data(); as d) {
            <p class="text-sm font-bold text-text-primary m-0">{{ d.firstName }} {{ d.lastName }}</p>
          }
        </div>

        <hr class="border-black/5" />

        <!-- Entrada -->
        <div class="space-y-1.5">
          <p class="text-xs font-bold text-text-secondary m-0">Entrada</p>
          @if (step1Data()?.ticket; as t) {
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-text-primary">{{ t.name }}</span>
              <span class="text-xs font-bold text-google-blue bg-google-blue/5 px-2.5 py-0.5 rounded-full">
                @if (step1Data()?.couponId) { Gratis · código aplicado } @else if (t.price > 0) { Bs {{ t.price }} } @else { Gratis }
              </span>
            </div>
          }
        </div>

        <!-- Sesiones -->
        @if (selectedSessions().length > 0) {
          <hr class="border-black/5" />
          <div class="space-y-2">
            <p class="text-xs font-bold text-text-secondary m-0">Sesiones</p>
            <div class="space-y-1.5">
              @for (s of selectedSessions(); track s.id) {
                <div class="flex items-start gap-2">
                  <span class="material-symbols-rounded text-sm text-google-green mt-0.5" aria-hidden="true">check_circle</span>
                  <div class="min-w-0">
                    <p class="text-xs font-semibold text-text-primary m-0 leading-snug">{{ s.title }}</p>
                    @if (s.track_name) {
                      <p class="text-xs text-text-secondary m-0">{{ s.track_name }}</p>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        } @else if (sessions().length > 0) {
          <hr class="border-black/5" />
          <div class="flex items-center gap-2">
            <span class="material-symbols-rounded text-sm text-text-secondary" aria-hidden="true">event_note</span>
            <p class="text-xs text-text-secondary m-0">Sin sesiones seleccionadas</p>
          </div>
        }

        <!-- Comprobante adjunto -->
        @if (step1Data()?.paymentProofFile; as f) {
          <hr class="border-black/5" />
          <div class="flex items-center gap-2">
            <span class="material-symbols-rounded text-sm text-google-green" aria-hidden="true">attach_file</span>
            <p class="text-xs text-text-secondary m-0">Comprobante: <strong>{{ f.name }}</strong></p>
          </div>
        }
      </div>

      <!-- Estado de éxito -->
      @if (success()) {
        <div class="rounded-2xl border border-google-green/20 bg-google-green/5 p-5 space-y-2">
          <div class="flex items-center gap-2 text-google-green font-bold text-sm">
            <span class="material-symbols-rounded text-lg" aria-hidden="true">check_circle</span>
            <span>{{ status() === 'PENDING' ? '¡Recibimos tu inscripción!' : '¡Listo, estás inscrito!' }}</span>
          </div>
          <p class="text-xs text-text-secondary leading-relaxed">
            {{
              status() === 'PENDING'
                ? 'Tu pago está en revisión; te avisaremos cuando lo validemos.'
                : 'Te esperamos el día del evento.'
            }}
          </p>
        </div>
      }

      <!-- Navegación del step -->
      @if (!success()) {
        <div class="flex gap-3">
          <button
            mat-stroked-button
            type="button"
            class="gdg-btn-outlined flex-1 text-xs font-bold py-3.5 sm:py-5 rounded-full"
            [disabled]="submitting()"
            (click)="back.emit()"
          >
            <span class="flex items-center justify-center gap-1">
              <span class="material-symbols-rounded text-sm" aria-hidden="true">chevron_left</span>
              <span>Atrás</span>
            </span>
          </button>
          <button
            mat-flat-button
            type="button"
            class="gdg-btn-filled flex-[2] text-xs font-bold py-3.5 sm:py-5 rounded-full"
            [disabled]="submitting()"
            (click)="confirm.emit()"
          >
            <span class="flex items-center justify-center gap-1.5">
              @if (submitting()) { <span>Registrando...</span> }
              @else {
                <span>Confirmar registro</span>
                <span class="material-symbols-rounded text-sm" aria-hidden="true">check</span>
              }
            </span>
          </button>
        </div>
      }
    </div>
  `,
})
export class StepConfirmar {
  readonly step1Data = input.required<StepDatosOutput | null>();
  readonly sessions = input<SessionWithTrack[]>([]);
  readonly selectedSessionIds = input<string[]>([]);
  readonly submitting = input<boolean>(false);
  /** Estado de la inscripción recién creada; null mientras no se ha enviado. */
  readonly status = input<RegistrationStatus | null>(null);
  readonly success = computed(() => this.status() !== null);

  readonly confirm = output<void>();
  readonly back = output<void>();

  readonly selectedSessions = computed(() =>
    this.sessions().filter((s) => this.selectedSessionIds().includes(s.id)),
  );
}
