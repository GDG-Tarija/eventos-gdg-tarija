import { Component, computed, effect, input, model, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { SessionWithTrack } from '../../../../../../core/models/session.model';
import { SessionPicker } from '../session-picker/session-picker';

@Component({
  selector: 'app-step-sesiones',
  standalone: true,
  imports: [MatButtonModule, SessionPicker],
  template: `
    <div class="space-y-5 pt-2">
      <!-- Info / instrucciones -->
      @if (sessions().length > 0 && !hideNavigation()) {
        <div class="rounded-2xl border border-google-blue/10 bg-google-blue/5 px-4 py-3 flex items-start gap-2.5">
          <span class="material-symbols-rounded text-base text-google-blue mt-0.5 shrink-0" aria-hidden="true">info</span>
          <p class="text-xs text-google-blue font-medium leading-relaxed m-0">
            Elegí las sesiones a las que querés asistir. Solo podés seleccionar
            <strong>una sesión por bloque horario</strong>.
          </p>
        </div>
      }

      <!-- Lista de sesiones -->
      <app-session-picker
        [sessions]="sessions()"
        [(selectedIds)]="selectedIds"
      />

      <!-- Resumen de selección (cuando hay más de 1 bloque con sesiones) -->
      @if (selectedIds().length > 0 && totalSlots() > 1) {
        <div class="rounded-xl border border-black/5 bg-white px-4 py-3 space-y-1.5">
          <p class="text-[10px] font-bold text-text-secondary uppercase tracking-wider m-0">
            Seleccionadas ({{ selectedIds().length }} de {{ totalSlots() }} bloques)
          </p>
          @for (s of selectedSessions(); track s.id) {
            <div class="flex items-center gap-2">
              <span class="material-symbols-rounded text-xs text-google-green" aria-hidden="true">check_circle</span>
              <span class="text-xs text-text-primary font-medium">{{ s.title }}</span>
            </div>
          }
        </div>
      }

      <!-- Navegación del step -->
      @if (!hideNavigation()) {
        <div class="flex gap-3 pt-1">
          <button
            mat-stroked-button
            type="button"
            class="gdg-btn-outlined flex-1 text-xs font-bold py-3.5 sm:py-5 rounded-xl sm:rounded-2xl"
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
            class="gdg-btn-filled flex-[2] text-xs font-bold py-3.5 sm:py-5 rounded-xl sm:rounded-2xl"
            (click)="next.emit()"
          >
            <span class="flex items-center justify-center gap-1.5">
              @if (sessions().length === 0 || selectedIds().length === 0) {
                <span>Omitir</span>
              } @else {
                <span>Continuar</span>
              }
              <span class="material-symbols-rounded text-sm" aria-hidden="true">chevron_right</span>
            </span>
          </button>
        </div>
      }
    </div>
  `,
})
export class StepSesiones {
  readonly sessions = input.required<SessionWithTrack[]>();
  readonly hideNavigation = input<boolean>(false);

  readonly next = output<void>();
  readonly back = output<void>();
  readonly selectionChange = output<string[]>();

  readonly selectedIds = model<string[]>([]);

  constructor() {
    effect(() => {
      this.selectionChange.emit(this.selectedIds());
    });
  }

  readonly totalSlots = computed(() => {
    const keys = new Set(this.sessions().map((s) => `${s.date ?? ''}|${s.start_time ?? ''}`));
    return keys.size;
  });

  readonly selectedSessions = computed(() =>
    this.sessions().filter((s) => this.selectedIds().includes(s.id)),
  );
}
