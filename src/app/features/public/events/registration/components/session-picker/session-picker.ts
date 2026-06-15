import { NgClass } from '@angular/common';
import { Component, computed, model, output, input, signal } from '@angular/core';
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

            <!-- ── Selector de Pestañas de Track (Mobile) ── -->
            @if (availableTracks().length > 1) {
              <div class="sm:hidden flex rounded-full bg-black/5 p-1 mb-2">
                <button
                  type="button"
                  class="flex-1 py-1.5 text-center text-[10px] font-bold rounded-full transition-all duration-200"
                  [class.bg-white]="activeMobileTrack() === 'ALL'"
                  [class.shadow-sm]="activeMobileTrack() === 'ALL'"
                  [class.text-google-blue]="activeMobileTrack() === 'ALL'"
                  [class.text-text-secondary]="activeMobileTrack() !== 'ALL'"
                  (click)="activeMobileTrack.set('ALL')"
                >
                  Todos
                </button>
                @for (trackName of availableTracks(); track trackName) {
                  <button
                    type="button"
                    class="flex-1 py-1.5 text-center text-[10px] font-bold rounded-full transition-all duration-200"
                    [class.bg-white]="activeMobileTrack() === trackName"
                    [class.shadow-sm]="activeMobileTrack() === trackName"
                    [class.text-google-blue]="activeMobileTrack() === trackName"
                    [class.text-text-secondary]="activeMobileTrack() !== trackName"
                    (click)="activeMobileTrack.set(trackName)"
                  >
                    {{ trackName }}
                  </button>
                }
              </div>
            }

            <!-- ── Cabecera de Pistas / Tracks (Desktop) ── -->
            @if (availableTracks().length > 1) {
              <div class="hidden sm:grid grid-cols-2 gap-3 pl-6 border-b border-black/5 pb-2 mb-1 text-center">
                @for (trackName of availableTracks(); track trackName) {
                  <span class="text-xs font-bold tracking-widest uppercase text-text-secondary">
                    {{ trackName }}
                  </span>
                }
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
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  @if (isPlenaryBlock(tg)) {
                    <!-- Caso Plenaria: Charlas generales (Cierre, Almuerzo, Keynote) sin track asignado -->
                    @for (session of tg.sessions; track session.id) {
                      @let isFull     = session.enrolled_count >= session.capacity;
                      @let isSelected = selectedIds().includes(session.id);
                      @let topics     = topicList(session.topic);
                      @let lvl        = levelStyle(session.level);

                      <button
                        type="button"
                        class="flex flex-col rounded-2xl border text-left transition-all duration-200 active:scale-[0.98] w-full p-5 space-y-3.5 bg-white sm:col-span-2"
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
                        <div class="flex items-center justify-between w-full">
                          <span class="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-black/5 text-text-secondary uppercase tracking-wider">
                            General
                          </span>
                        </div>

                        <div class="text-sm font-bold text-text-primary leading-snug font-google">
                          {{ session.title }}
                        </div>

                        @if (session.speaker) {
                          <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-black/5 flex items-center justify-center border border-black/10">
                              @if (session.speaker_avatar_url) {
                                <img [src]="session.speaker_avatar_url" [alt]="session.speaker" class="w-full h-full object-cover" />
                              } @else {
                                <span class="material-symbols-rounded text-lg text-text-muted/60" aria-hidden="true">person</span>
                              }
                            </div>
                            <span class="text-sm text-text-secondary font-medium">{{ session.speaker }}</span>
                          </div>
                        }

                        @if (session.level || topics.length > 0) {
                          <div class="flex items-center gap-2 flex-wrap">
                            @if (lvl) {
                              <span class="text-xs font-bold px-2.5 py-0.5 rounded-full" [ngClass]="[lvl.bg, lvl.text]">
                                {{ lvl.label }}
                              </span>
                            }
                            @for (t of topics; track t) {
                              <span class="text-xs font-medium text-text-secondary/70">
                                #{{ t }}
                              </span>
                            }
                          </div>
                        }
                      </button>
                    }
                  } @else {
                    <!-- Caso Multi-Track Paralelo -->

                    <!-- Vista Desktop (Ambos tracks en 2 columnas fijas) -->
                    @for (trackName of availableTracks(); track trackName) {
                      @let session = getSessionForTrack(tg.sessions, trackName);

                      @if (session) {
                        @let isFull     = session.enrolled_count >= session.capacity;
                        @let isSelected = selectedIds().includes(session.id);
                        @let color      = trackColor(trackColorIndex(session.track_name));
                        @let topics     = topicList(session.topic);
                        @let lvl        = levelStyle(session.level);

                        <button
                          type="button"
                          class="hidden sm:flex flex-col rounded-2xl border text-left transition-all duration-200 active:scale-[0.98] w-full p-5 space-y-3.5 bg-white"
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
                          @if (session.track_name) {
                            <span class="self-start text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider sm:hidden" [ngClass]="[color.bg, color.text]">
                              {{ session.track_name }}
                            </span>
                          }

                          <div class="text-sm font-bold text-text-primary leading-snug font-google">
                            {{ session.title }}
                          </div>

                          @if (session.speaker) {
                            <div class="flex items-center gap-2.5">
                              <div class="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-black/5 flex items-center justify-center border border-black/10">
                                @if (session.speaker_avatar_url) {
                                  <img [src]="session.speaker_avatar_url" [alt]="session.speaker" class="w-full h-full object-cover" />
                                } @else {
                                  <span class="material-symbols-rounded text-lg text-text-muted/60" aria-hidden="true">person</span>
                                }
                              </div>
                              <span class="text-sm text-text-secondary font-medium">{{ session.speaker }}</span>
                            </div>
                          }

                          @if (session.level || topics.length > 0) {
                            <div class="flex items-center gap-2 flex-wrap">
                              @if (lvl) {
                                <span class="text-xs font-bold px-2.5 py-0.5 rounded-full" [ngClass]="[lvl.bg, lvl.text]">
                                  {{ lvl.label }}
                                </span>
                              }
                              @for (t of topics; track t) {
                                <span class="text-xs font-medium text-text-secondary/70">
                                  #{{ t }}
                                </span>
                              }
                            </div>
                          }

                          <div class="flex items-center gap-1.5 mt-auto pt-1 w-full">
                            <span class="material-symbols-rounded text-base" [class.text-google-green]="!isFull" [class.text-google-red]="isFull" aria-hidden="true">
                              {{ isFull ? 'person_off' : 'group' }}
                            </span>
                            <span class="text-xs font-semibold" [class.text-google-green]="!isFull" [class.text-google-red]="isFull">
                              @if (isFull) { Sin cupos }
                              @else { {{ session.capacity - session.enrolled_count }} lugares disponibles }
                            </span>
                          </div>
                        </button>
                      } @else {
                        <!-- Placeholder si no hay charla para este track en este bloque en Desktop -->
                        <div class="hidden sm:flex flex-col justify-center items-center rounded-2xl border border-dashed border-black/10 text-center w-full p-4 min-h-[120px] bg-black/[0.01] text-text-muted space-y-1">
                          <span class="material-symbols-rounded text-lg text-text-muted/50" aria-hidden="true">coffee</span>
                          <div class="text-xs font-bold font-google text-text-secondary">Espacio libre</div>
                          <div class="text-[9px] font-medium leading-relaxed">Break / Networking</div>
                        </div>
                      }
                    }

                    <!-- Vista Mobile (Filtrada por la pestaña activa) -->
                    @for (trackName of availableTracks(); track trackName) {
                      @if (activeMobileTrack() === 'ALL' || activeMobileTrack() === trackName) {
                        @let session = getSessionForTrack(tg.sessions, trackName);

                        @if (session) {
                          @let isFull     = session.enrolled_count >= session.capacity;
                          @let isSelected = selectedIds().includes(session.id);
                          @let color      = trackColor(trackColorIndex(session.track_name));
                          @let topics     = topicList(session.topic);
                          @let lvl        = levelStyle(session.level);

                          <button
                            type="button"
                            class="flex sm:hidden flex-col rounded-2xl border text-left transition-all duration-200 active:scale-[0.98] w-full p-5 space-y-3.5 bg-white"
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
                            @if (session.track_name) {
                              <span class="self-start text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider" [ngClass]="[color.bg, color.text]">
                                {{ session.track_name }}
                              </span>
                            }

                            <div class="text-sm font-bold text-text-primary leading-snug font-google">
                              {{ session.title }}
                            </div>

                            @if (session.speaker) {
                              <div class="flex items-center gap-2.5">
                                <div class="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-black/5 flex items-center justify-center border border-black/10">
                                  @if (session.speaker_avatar_url) {
                                    <img [src]="session.speaker_avatar_url" [alt]="session.speaker" class="w-full h-full object-cover" />
                                  } @else {
                                    <span class="material-symbols-rounded text-lg text-text-muted/60" aria-hidden="true">person</span>
                                  }
                                </div>
                                <span class="text-sm text-text-secondary font-medium">{{ session.speaker }}</span>
                              </div>
                            }

                            @if (session.level || topics.length > 0) {
                              <div class="flex items-center gap-2 flex-wrap">
                                @if (lvl) {
                                  <span class="text-xs font-bold px-2.5 py-0.5 rounded-full" [ngClass]="[lvl.bg, lvl.text]">
                                    {{ lvl.label }}
                                  </span>
                                }
                                @for (t of topics; track t) {
                                  <span class="text-xs font-medium text-text-secondary/70">
                                    #{{ t }}
                                  </span>
                                }
                              </div>
                            }

                            <div class="flex items-center gap-1.5 mt-auto pt-1 w-full">
                              <span class="material-symbols-rounded text-base" [class.text-google-green]="!isFull" [class.text-google-red]="isFull" aria-hidden="true">
                                {{ isFull ? 'person_off' : 'group' }}
                              </span>
                              <span class="text-xs font-semibold" [class.text-google-green]="!isFull" [class.text-google-red]="isFull">
                                @if (isFull) { Sin cupos }
                                @else { {{ session.capacity - session.enrolled_count }} lugares disponibles }
                              </span>
                            </div>
                          </button>
                        }
                      }
                    }
                  }
                </div>

              </div>
            }

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

  // Filtro de track activo para vista móvil
  protected readonly activeMobileTrack = signal<string>('ALL');

  // Identifica los tracks únicos y ordenados presentes en el evento
  readonly availableTracks = computed<string[]>(() => {
    const tracks = this.sessions()
      .map((s) => s.track_name)
      .filter((name): name is string => typeof name === 'string' && name.trim().length > 0);
    return [...new Set(tracks)].sort();
  });

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

  // Determina si un bloque de tiempo es una plenaria (sesión unificada)
  isPlenaryBlock(tg: SessionTimeGroup): boolean {
    return tg.sessions.every((s) => !s.track_name || s.track_name.trim().length === 0);
  }

  // Obtiene la sesión correspondiente a un track específico en un bloque
  getSessionForTrack(sessions: SessionWithTrack[], trackName: string): SessionWithTrack | undefined {
    return sessions.find((s) => s.track_name === trackName);
  }

  // ── Toggle con detección de conflicto fecha+hora ─────────
  toggle(session: SessionWithTrack): void {
    if (session.enrolled_count >= session.capacity) return;
    const current = this.selectedIds();

    // Elimina de la selección toda sesión concurrente (misma date Y mismo start_time)
    const filtered = current.filter((id) => {
      const s = this.sessions().find((x) => x.id === id);
      if (!s) return true;
      if (session.date && s.date && session.start_time && s.start_time) {
        return !(s.date === session.date && s.start_time === session.start_time);
      }
      return true;
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
    const [y, m, day] = d.split('-').map(Number);
    const date = new Date(y, m - 1, day);
    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  }
}
