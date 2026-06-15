import { NgClass } from '@angular/common';
import { Component, computed, model, output, input } from '@angular/core';
import {
  SessionDateGroup,
  SessionLevel,
  SessionTimeGroup,
  SessionWithTrack,
} from '../../../../../../core/models/session.model';

const TRACK_COLORS: Record<number, { bg: string; text: string }> = {
  0: { bg: 'bg-google-blue/10',   text: 'text-google-blue'   },
  1: { bg: 'bg-google-green/10',  text: 'text-google-green'  },
  2: { bg: 'bg-google-red/10',    text: 'text-google-red'    },
  3: { bg: 'bg-google-yellow/10', text: 'text-google-yellow' },
};

const LEVEL_STYLES: Record<SessionLevel, { bg: string; text: string; label: string }> = {
  Basico:     { bg: 'bg-google-green/10',  text: 'text-google-green',  label: 'Básico'      },
  Intermedio: { bg: 'bg-google-yellow/10', text: 'text-google-yellow', label: 'Intermedio'  },
  Avanzado:   { bg: 'bg-google-red/10',    text: 'text-google-red',    label: 'Avanzado'    },
};

@Component({
  selector: 'app-session-picker',
  standalone: true,
  imports: [NgClass],
  template: `
    @if (dateGroups().length === 0) {
      <p class="text-sm text-text-secondary m-0 py-2">
        Este evento no tiene sesiones adicionales.
      </p>
    } @else {
      <div class="space-y-6">

        @for (dg of dateGroups(); track dg.date) {

          <div class="space-y-4">

            <!-- ── Encabezado de fecha ─────────────────── -->
            @if (dg.date) {
              <div class="flex items-center gap-2">
                <span class="material-symbols-rounded text-base text-google-blue" aria-hidden="true">calendar_today</span>
                <h4 class="text-sm font-bold text-text-primary m-0 capitalize">
                  {{ formatDateFull(dg.date) }}
                </h4>
              </div>
            }

            <!-- ── Bloques horarios ────────────────────── -->
            @for (tg of dg.timeGroups; track tg.startTime) {

              <div class="space-y-2 pl-0 sm:pl-6">

                <!-- Cabecera del bloque horario -->
                <div class="flex items-center gap-2 flex-wrap">
                  <div class="flex items-center gap-1.5">
                    <span class="material-symbols-rounded text-sm text-text-secondary" aria-hidden="true">schedule</span>
                    <span class="text-xs font-bold text-text-primary tabular-nums">
                      @if (tg.startTime) {
                        {{ formatTime(tg.startTime) }}
                        @if (tg.endTime) { &ndash; {{ formatTime(tg.endTime) }} }
                      } @else {
                        Horario por confirmar
                      }
                    </span>
                  </div>

                  @if (tg.sessions.length > 1) {
                    <span class="text-[10px] font-semibold text-text-secondary bg-black/5 px-2 py-0.5 rounded-full">
                      Paralelas · elegí una
                    </span>
                  }
                </div>

                <!-- Cards de sesión del bloque -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  @for (session of tg.sessions; track session.id) {
                    @let isFull     = session.enrolled_count >= session.capacity;
                    @let isSelected = selectedIds().includes(session.id);
                    @let color      = trackColor(trackColorIndex(session.track_name));
                    @let topics     = topicList(session.topic);
                    @let lvl        = levelStyle(session.level);

                    <button
                      type="button"
                      class="flex flex-col rounded-2xl border text-left transition-all duration-200 active:scale-[0.98] w-full p-4 space-y-2.5 bg-white"
                      [class.border-google-blue]="isSelected"
                      [class.bg-google-blue\/\[0\.02\]]="isSelected"
                      [class.shadow-md]="isSelected"
                      [class.border-black\/5]="!isSelected && !isFull"
                      [class.hover\:border-black\/10]="!isSelected && !isFull"
                      [class.hover\:-translate-y-0\.5]="!isFull"
                      [class.opacity-50]="isFull"
                      [class.cursor-not-allowed]="isFull"
                      [class.cursor-pointer]="!isFull"
                      [disabled]="isFull"
                      (click)="toggle(session)"
                      [attr.aria-pressed]="isSelected"
                      [attr.aria-label]="session.title + (isFull ? ' (sin cupos)' : '')"
                    >
                      <!-- Track badge -->
                      @if (session.track_name) {
                        <span
                          class="self-start text-[10px] font-bold px-2 py-0.5 rounded-full"
                          [ngClass]="[color.bg, color.text]"
                        >
                          {{ session.track_name }}
                        </span>
                      }

                      <!-- Título -->
                      <div class="text-sm font-bold text-text-primary leading-snug font-google">
                        {{ session.title }}
                      </div>

                      <!-- Speaker + Ciudad -->
                      @if (session.speaker) {
                        <div class="flex items-center gap-1 flex-wrap">
                          <span class="material-symbols-rounded text-[14px] text-text-secondary" aria-hidden="true">person</span>
                          <span class="text-xs text-text-secondary font-medium">{{ session.speaker }}</span>
                          @if (session.city) {
                            <span class="text-text-muted text-[10px] mx-0.5">·</span>
                            <span class="material-symbols-rounded text-[14px] text-text-secondary" aria-hidden="true">location_on</span>
                            <span class="text-xs text-text-secondary">{{ session.city }}</span>
                          }
                        </div>
                      }

                      <!-- Level + Topics -->
                      @if (session.level || topics.length > 0) {
                        <div class="flex items-center gap-1.5 flex-wrap">
                          @if (lvl) {
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" [ngClass]="[lvl.bg, lvl.text]">
                              {{ lvl.label }}
                            </span>
                          }
                          @for (t of topics; track t) {
                            <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/5 text-text-secondary">
                              {{ t }}
                            </span>
                          }
                        </div>
                      }

                      <!-- Footer: cupos -->
                      <div class="flex items-center gap-1 pt-1.5 border-t border-black/5 w-full mt-auto">
                        <span
                          class="material-symbols-rounded text-sm"
                          [class.text-google-green]="!isFull"
                          [class.text-google-red]="isFull"
                          aria-hidden="true"
                        >{{ isFull ? 'person_off' : 'group' }}</span>
                        <span
                          class="text-xs font-semibold"
                          [class.text-google-green]="!isFull"
                          [class.text-google-red]="isFull"
                        >
                          @if (isFull) { Sin cupos }
                          @else {
                            {{ session.capacity - session.enrolled_count }}
                            lugar{{ session.capacity - session.enrolled_count === 1 ? '' : 'es' }} disponibles
                          }
                        </span>
                      </div>
                    </button>
                  }
                </div>

              </div>
            }

          </div>
        }

        <!-- Resumen de selección -->
        @if (selectedIds().length > 0) {
          <div class="rounded-xl border border-google-blue/20 bg-google-blue/5 px-4 py-3">
            <p class="text-xs text-google-blue font-semibold m-0">
              <span class="material-symbols-rounded text-sm align-middle mr-1" aria-hidden="true">check_circle</span>
              {{ selectedIds().length }} sesión{{ selectedIds().length === 1 ? '' : 'es' }}
              seleccionada{{ selectedIds().length === 1 ? '' : 's' }}
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

  // ── Agrupación fecha → hora ──────────────────────────────
  readonly dateGroups = computed<SessionDateGroup[]>(() => {
    const dateMap = new Map<string, SessionWithTrack[]>();
    for (const s of this.sessions()) {
      const key = s.date ?? '';
      if (!dateMap.has(key)) dateMap.set(key, []);
      dateMap.get(key)!.push(s);
    }

    const groups: SessionDateGroup[] = [];

    for (const [date, dateSessions] of dateMap.entries()) {
      const timeMap = new Map<string, SessionWithTrack[]>();
      for (const s of dateSessions) {
        const key = s.start_time ?? '';
        if (!timeMap.has(key)) timeMap.set(key, []);
        timeMap.get(key)!.push(s);
      }

      const timeGroups: SessionTimeGroup[] = Array.from(timeMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([startTime, sessions]): SessionTimeGroup => ({
          startTime: startTime || null,
          endTime: sessions[0]?.end_time ?? null,
          sessions,
        }));

      groups.push({ date: date || null, timeGroups });
    }

    return groups.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  });

  // ── Toggle con detección de conflicto fecha+hora ─────────
  toggle(session: SessionWithTrack): void {
    if (session.enrolled_count >= session.capacity) return;
    const current = this.selectedIds();

    // Elimina de la selección toda sesión que sea concurrente con la que se hace clic.
    // "Concurrente" = misma date Y mismo start_time.
    // Si alguna de las dos sesiones no tiene date o start_time, no se puede determinar
    // el conflicto en el frontend: se deja pasar y el trigger DB lo bloquea si aplica.
    const filtered = current.filter((id) => {
      const s = this.sessions().find((x) => x.id === id);
      if (!s) return true;
      if (session.date && s.date && session.start_time && s.start_time) {
        return !(s.date === session.date && s.start_time === session.start_time);
      }
      return true; // sin info suficiente → conservar, el DB trigger es la última barrera
    });

    const next = current.includes(session.id) ? filtered : [...filtered, session.id];
    this.selectedIds.set(next);
    this.selectionChange.emit(next);
  }

  // ── Helpers ──────────────────────────────────────────────
  trackColorIndex(trackName: string | null): number {
    if (!trackName) return 0;
    const allTracks = [...new Set(this.sessions().map((s) => s.track_name).filter(Boolean))];
    const idx = allTracks.indexOf(trackName);
    return idx >= 0 ? idx % Object.keys(TRACK_COLORS).length : 0;
  }

  trackColor(idx: number): { bg: string; text: string } {
    return TRACK_COLORS[idx] ?? TRACK_COLORS[0];
  }

  levelStyle(level: SessionLevel | null): { bg: string; text: string; label: string } | null {
    return level ? (LEVEL_STYLES[level] ?? null) : null;
  }

  topicList(topic: string | null): string[] {
    if (!topic) return [];
    return topic.split(',').map((t) => t.trim()).filter(Boolean);
  }

  formatTime(t: string): string {
    return t.substring(0, 5);
  }

  formatDateFull(d: string): string {
    // Parse as local date to avoid UTC offset shifting the day
    const [y, m, day] = d.split('-').map(Number);
    const date = new Date(y, m - 1, day);
    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  }
}
