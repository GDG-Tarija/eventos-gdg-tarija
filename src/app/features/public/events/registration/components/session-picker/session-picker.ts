import {
  Component,
  computed,
  input,
  model,
  output,
} from '@angular/core';
import { SessionSlotGroup, SessionWithTrack } from '../../../../../../core/models/session.model';

const TRACK_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  0: { bg: 'bg-google-blue/10', text: 'text-google-blue', border: 'border-google-blue' },
  1: { bg: 'bg-google-green/10', text: 'text-google-green', border: 'border-google-green' },
  2: { bg: 'bg-google-red/10', text: 'text-google-red', border: 'border-google-red' },
  3: { bg: 'bg-google-yellow/10', text: 'text-google-yellow', border: 'border-google-yellow' },
};

@Component({
  selector: 'app-session-picker',
  standalone: true,
  template: `
    @if (slotGroups().length === 0) {
      <p class="text-sm text-text-secondary m-0">No hay sesiones disponibles para este evento.</p>
    } @else {
      <div class="space-y-5">
        @for (group of slotGroups(); track group.slot) {
          <div class="space-y-2">
            <p class="text-xs font-bold text-text-secondary uppercase tracking-wider m-0">
              Bloque {{ group.slot }}
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              @for (session of group.sessions; track session.id) {
                @let isFull = session.enrolled_count >= session.capacity;
                @let isSelected = selectedIds().includes(session.id);
                @let colorIdx = trackColorIndex(session.track_name);
                @let color = trackColor(colorIdx);

                <button
                  type="button"
                  class="flex flex-col rounded-2xl border overflow-hidden text-left transition-all duration-300 active:scale-[0.98] w-full p-4 space-y-2 bg-white"
                  [class.border-google-blue]="isSelected"
                  [class.bg-google-blue/[0.01]]="isSelected"
                  [class.shadow-md]="isSelected"
                  [class.border-black/5]="!isSelected && !isFull"
                  [class.hover:border-black/10]="!isSelected && !isFull"
                  [class.hover:-translate-y-0.5]="!isFull"
                  [class.opacity-50]="isFull"
                  [class.cursor-not-allowed]="isFull"
                  [class.cursor-pointer]="!isFull"
                  [disabled]="isFull"
                  (click)="toggle(session)"
                  [attr.aria-pressed]="isSelected"
                  [attr.aria-label]="session.title + (isFull ? ' (sin cupos)' : '')"
                >
                  <!-- Badge del track -->
                  @if (session.track_name) {
                    <span
                      class="self-start text-[10px] font-bold px-2 py-0.5 rounded-full"
                      [class]="color.bg + ' ' + color.text"
                    >
                      {{ session.track_name }}
                    </span>
                  }

                  <!-- Título -->
                  <div class="text-sm font-bold text-text-primary leading-tight font-google">
                    {{ session.title }}
                  </div>

                  <!-- Descripción opcional -->
                  @if (session.description) {
                    <div class="text-xs text-text-secondary leading-relaxed line-clamp-2">
                      {{ session.description }}
                    </div>
                  }

                  <!-- Cupos -->
                  <div class="flex items-center gap-1 pt-1 border-t border-black/5 w-full">
                    <span
                      class="material-symbols-rounded text-sm"
                      [class.text-google-green]="!isFull"
                      [class.text-google-red]="isFull"
                      aria-hidden="true"
                    >
                      {{ isFull ? 'person_off' : 'group' }}
                    </span>
                    <span
                      class="text-xs font-semibold"
                      [class.text-google-green]="!isFull"
                      [class.text-google-red]="isFull"
                    >
                      @if (isFull) {
                        Sin cupos
                      } @else {
                        {{ session.capacity - session.enrolled_count }} lugar{{
                          session.capacity - session.enrolled_count === 1 ? '' : 'es'
                        }} disponibles
                      }
                    </span>
                  </div>
                </button>
              }
            </div>
          </div>
        }

        @if (selectedIds().length > 0) {
          <div class="rounded-xl border border-google-blue/20 bg-google-blue/5 px-4 py-3">
            <p class="text-xs text-google-blue font-semibold m-0">
              <span class="material-symbols-rounded text-sm align-middle mr-1" aria-hidden="true">check_circle</span>
              Sesiones elegidas: {{ selectedIds().length }}
            </p>
          </div>
        }
      </div>
    }
  `,
})
export class SessionPicker {
  readonly sessions = input.required<SessionWithTrack[]>();
  readonly selectedIds = model<string[]>([]);
  readonly selectionChange = output<string[]>();

  readonly slotGroups = computed<SessionSlotGroup[]>(() => {
    const map = new Map<number, SessionWithTrack[]>();
    for (const s of this.sessions()) {
      const slot = s.time_slot;
      if (!map.has(slot)) map.set(slot, []);
      map.get(slot)!.push(s);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([slot, sessions]) => ({ slot, sessions }));
  });

  toggle(session: SessionWithTrack): void {
    if (session.enrolled_count >= session.capacity) return;

    const current = this.selectedIds();

    // Quitar cualquier sesión del mismo time_slot ya seleccionada
    const filtered = current.filter((id) => {
      const s = this.sessions().find((x) => x.id === id);
      return s?.time_slot !== session.time_slot;
    });

    // Toggle: si ya estaba en la selección (luego de filtrar), la quitamos
    const alreadySelected = current.includes(session.id);
    const next = alreadySelected ? filtered : [...filtered, session.id];

    this.selectedIds.set(next);
    this.selectionChange.emit(next);
  }

  trackColorIndex(trackName: string | null): number {
    if (!trackName) return 0;
    const allTracks = [...new Set(this.sessions().map((s) => s.track_name).filter(Boolean))];
    const idx = allTracks.indexOf(trackName);
    return idx >= 0 ? idx % Object.keys(TRACK_COLORS).length : 0;
  }

  trackColor(idx: number): { bg: string; text: string; border: string } {
    return TRACK_COLORS[idx] ?? TRACK_COLORS[0];
  }
}
