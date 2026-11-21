import { NgClass } from '@angular/common';
import { Component, computed, model, output, input, signal } from '@angular/core';
import { SessionLevel, SessionWithTrack } from '../../../../../../core/models/session.model';
import { LOW_STOCK_THRESHOLD } from '../../data/ticket-availability';
import {
  buildSchedule,
  hhmm,
  sessionDuration,
  sessionsOverlap,
  toggleSession,
} from '../../data/session-schedule';

const TRACK_DOTS = ['bg-google-blue', 'bg-google-green', 'bg-google-red', 'bg-google-yellow'];

const LEVEL_STYLES: Record<SessionLevel, { bg: string; text: string; label: string }> = {
  Basico: { bg: 'bg-google-green/10', text: 'text-google-green-dark', label: 'Básico' },
  Intermedio: { bg: 'bg-google-yellow/10', text: 'text-google-yellow-dark', label: 'Intermedio' },
  Avanzado: { bg: 'bg-google-red/10', text: 'text-google-red-dark', label: 'Avanzado' },
};

@Component({
  selector: 'app-session-picker',
  standalone: true,
  imports: [NgClass],
  template: `
    @if (sessions().length === 0) {
      <p class="text-sm text-text-secondary m-0 py-2">Este evento no tiene sesiones adicionales.</p>
    } @else {
      <div class="space-y-6">
        <!-- ── Filtro por track ─────────────────────── -->
        @if (tracks().length > 1) {
          <div
            class="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="group"
            aria-label="Filtrar sesiones por track"
          >
            <button
              type="button"
              class="inline-flex shrink-0 items-center gap-2 min-h-10 px-4 m-0 rounded-full border border-solid text-sm font-medium whitespace-nowrap [font-family:inherit] cursor-pointer transition-colors duration-150"
              [ngClass]="activeTrack() === null ? chipOn : chipOff"
              [attr.aria-pressed]="activeTrack() === null"
              (click)="activeTrack.set(null)"
            >
              Todos
            </button>
            @for (t of tracks(); track t; let i = $index) {
              <button
                type="button"
                class="inline-flex shrink-0 items-center gap-2 min-h-10 px-4 m-0 rounded-full border border-solid text-sm font-medium whitespace-nowrap [font-family:inherit] cursor-pointer transition-colors duration-150"
                [ngClass]="activeTrack() === t ? chipOn : chipOff"
                [attr.aria-pressed]="activeTrack() === t"
                (click)="activeTrack.set(t)"
              >
                <span
                  class="w-2 h-2 rounded-full shrink-0"
                  [ngClass]="trackDot(i)"
                  aria-hidden="true"
                ></span>
                {{ t }}
              </button>
            }
          </div>
        }

        @for (day of days(); track day.date) {
          <section class="space-y-5">
            @if (day.date) {
              <h4 class="flex items-center gap-2 text-sm font-bold text-text-primary m-0">
                <span class="material-symbols-rounded text-base text-google-blue" aria-hidden="true"
                  >calendar_today</span
                >
                {{ formatDateFull(day.date) }}
              </h4>
            }

            @for (block of day.blocks; track block.start) {
              <div class="space-y-2">
                <div class="flex items-baseline gap-2">
                  <span class="text-sm font-bold text-text-primary tabular-nums">
                    {{ block.start ?? 'Horario por confirmar' }}
                  </span>
                  @if (block.sessions.length > 1) {
                    <span class="text-xs text-text-secondary">Elige una</span>
                  }
                </div>

                <!-- Sesiones largas que empezaron en un bloque anterior -->
                @for (o of block.ongoing; track o.id) {
                  <p class="flex items-center gap-1.5 m-0 text-xs text-text-secondary">
                    <span class="material-symbols-rounded text-sm" aria-hidden="true"
                      >more_time</span
                    >
                    <span>
                      <span class="font-semibold text-text-primary">{{ o.title }}</span>
                      sigue hasta las {{ time(o.end_time) }}
                      @if (isSelected(o)) {
                        <span class="font-bold text-google-blue-dark">· Tu selección</span>
                      }
                    </span>
                  </p>
                }

                <ul
                  class="m-0 p-0 list-none rounded-3xl border border-solid border-black/10 bg-white overflow-hidden divide-y divide-solid divide-black/5"
                >
                  @for (s of block.sessions; track s.id) {
                    @let selected = isSelected(s);
                    @let full = isFull(s);
                    @let blocked = full && !selected;
                    @let lvl = levelStyle(s.level);
                    @let duration = sessionDuration(s);
                    @let replaces = replacedBy(s);
                    @let left = s.capacity - s.enrolled_count;
                    @let topics = topicList(s.topic);

                    <li
                      class="transition-colors duration-150"
                      [class.bg-google-blue/5]="selected"
                      [class.bg-surface-main]="blocked"
                    >
                      <button
                        type="button"
                        class="w-full flex items-start gap-3 p-4 m-0 text-left bg-transparent border-0 [font-family:inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-google-blue-dark"
                        [class.cursor-pointer]="!blocked"
                        [class.hover:bg-black/5]="!blocked && !selected"
                        [class.cursor-not-allowed]="blocked"
                        [attr.aria-pressed]="selected"
                        [attr.aria-disabled]="blocked"
                        (click)="toggle(s)"
                      >
                        @if (s.speaker) {
                          <span
                            class="w-14 h-14 rounded-full overflow-hidden shrink-0 bg-black/5 flex items-center justify-center"
                          >
                            @if (s.speaker_avatar_url) {
                              <img
                                [src]="s.speaker_avatar_url"
                                alt=""
                                loading="lazy"
                                class="w-full h-full object-cover"
                              />
                            } @else {
                              <span
                                class="material-symbols-rounded text-2xl text-text-muted"
                                aria-hidden="true"
                                >person</span
                              >
                            }
                          </span>
                        }

                        <span class="flex-1 min-w-0 space-y-1">
                          <span
                            class="block font-google text-base font-bold leading-snug"
                            [class.text-text-primary]="!blocked"
                            [class.text-text-secondary]="blocked"
                          >
                            {{ s.title }}
                          </span>

                          @if (s.speaker) {
                            <span class="block text-sm text-text-secondary">{{ s.speaker }}</span>
                          }

                          <span
                            class="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-text-secondary"
                          >
                            @if (s.track_name) {
                              <span
                                class="inline-flex items-center gap-1.5 font-semibold text-text-primary"
                              >
                                <span
                                  class="w-2 h-2 rounded-full"
                                  [ngClass]="trackDot(trackIndex(s.track_name))"
                                  aria-hidden="true"
                                ></span>
                                {{ s.track_name }}
                              </span>
                            } @else {
                              <span class="font-semibold text-text-primary">General</span>
                            }
                            @if (duration) {
                              <span class="tabular-nums"
                                >{{ duration }} · hasta {{ time(s.end_time) }}</span
                              >
                            }
                            <span
                              class="font-semibold tabular-nums"
                              [class.text-google-red-dark]="full"
                              [class.text-google-yellow-dark]="!full && left <= lowStock"
                            >
                              @if (full) {
                                Sin cupos
                              } @else if (left === 1) {
                                Queda 1 cupo
                              } @else if (left <= lowStock) {
                                Quedan {{ left }} cupos
                              } @else {
                                {{ left }} cupos
                              }
                            </span>
                          </span>

                          @if (lvl || topics.length > 0) {
                            <span class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                              @if (lvl) {
                                <span
                                  class="font-bold px-2 py-0.5 rounded-full"
                                  [ngClass]="[lvl.bg, lvl.text]"
                                  >{{ lvl.label }}</span
                                >
                              }
                              @for (t of topics; track t) {
                                <span class="text-text-secondary">#{{ t }}</span>
                              }
                            </span>
                          }

                          @if (replaces.length > 0 && !blocked) {
                            <span
                              class="flex items-center gap-1 pt-1 text-xs font-medium text-google-yellow-dark"
                            >
                              <span class="material-symbols-rounded text-sm" aria-hidden="true"
                                >swap_horiz</span
                              >
                              Reemplaza a «{{ replaces.join('», «') }}»
                            </span>
                          }
                        </span>

                        <span
                          class="material-symbols-rounded text-2xl shrink-0"
                          [class.text-google-blue-dark]="selected"
                          [class.text-text-secondary/80]="!selected && !blocked"
                          [class.text-black/20]="blocked"
                          aria-hidden="true"
                        >
                          {{ selected ? 'check_circle' : 'radio_button_unchecked' }}
                        </span>
                      </button>

                      @if (s.description) {
                        <!-- Espaciador del ancho de la foto: alinea el detalle con el texto del botón -->
                        <div class="flex gap-3 px-4 pb-3 -mt-2">
                          @if (s.speaker) {
                            <span class="w-14 shrink-0" aria-hidden="true"></span>
                          }
                          <details class="group flex-1 min-w-0">
                            <summary
                              class="inline-flex items-center gap-0.5 list-none cursor-pointer text-xs font-semibold text-google-blue-dark [&::-webkit-details-marker]:hidden"
                            >
                              Ver detalle
                              <span
                                class="material-symbols-rounded text-base transition-transform duration-200 group-open:rotate-180"
                                aria-hidden="true"
                                >expand_more</span
                              >
                            </summary>
                            <p
                              class="mt-2 mb-0 text-sm text-text-secondary leading-relaxed whitespace-pre-line"
                            >
                              {{ s.description }}
                            </p>
                          </details>
                        </div>
                      }
                    </li>
                  }
                </ul>
              </div>
            }
          </section>
        }
      </div>
    }
  `,
})
export class SessionPicker {
  readonly sessions = input.required<SessionWithTrack[]>();
  readonly selectedIds = model<string[]>([]);
  readonly selectionChange = output<string[]>();

  protected readonly activeTrack = signal<string | null>(null);
  protected readonly lowStock = LOW_STOCK_THRESHOLD;
  protected readonly sessionDuration = sessionDuration;
  protected readonly chipOn = 'bg-google-blue-light border-transparent text-google-blue-dark';
  protected readonly chipOff = 'bg-white border-black/10 text-text-secondary hover:bg-black/5';

  readonly tracks = computed<string[]>(() => {
    const names = this.sessions()
      .map((s) => s.track_name)
      .filter((name): name is string => typeof name === 'string' && name.trim().length > 0);
    return [...new Set(names)].sort();
  });

  // Las sesiones generales (sin track) se muestran con cualquier filtro.
  readonly days = computed(() => {
    const track = this.activeTrack();
    return buildSchedule(
      this.sessions().filter((s) => !track || !s.track_name || s.track_name === track),
    );
  });

  private readonly selectedSessions = computed(() =>
    this.sessions().filter((s) => this.selectedIds().includes(s.id)),
  );

  isSelected(s: SessionWithTrack): boolean {
    return this.selectedIds().includes(s.id);
  }

  isFull(s: SessionWithTrack): boolean {
    return s.enrolled_count >= s.capacity;
  }

  /** Selecciones de otro bloque que se quitarían al elegir `s` (las del mismo bloque ya se entienden). */
  replacedBy(s: SessionWithTrack): string[] {
    if (this.isSelected(s)) return [];
    return this.selectedSessions()
      .filter((o) => sessionsOverlap(o, s) && hhmm(o.start_time) !== hhmm(s.start_time))
      .map((o) => o.title);
  }

  // Una sesión llena sigue pudiendo quitarse: el cupo puede ser el de esta misma inscripción.
  toggle(session: SessionWithTrack): void {
    if (this.isFull(session) && !this.isSelected(session)) return;
    const next = toggleSession(this.selectedIds(), session, this.sessions());
    this.selectedIds.set(next);
    this.selectionChange.emit(next);
  }

  trackIndex(name: string): number {
    return this.tracks().indexOf(name);
  }

  trackDot(idx: number): string {
    return TRACK_DOTS[idx % TRACK_DOTS.length];
  }

  levelStyle(level: SessionLevel | null): { bg: string; text: string; label: string } | null {
    return level ? (LEVEL_STYLES[level] ?? null) : null;
  }

  topicList(topic: string | null): string[] {
    if (!topic) return [];
    return topic
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }

  time(t: string | null): string {
    return hhmm(t) ?? '';
  }

  formatDateFull(d: string): string {
    const [y, m, day] = d.split('-').map(Number);
    const date = new Date(y, m - 1, day);
    const label = date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
}
