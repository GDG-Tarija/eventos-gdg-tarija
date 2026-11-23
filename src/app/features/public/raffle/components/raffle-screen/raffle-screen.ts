import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type RafflePhase = 'idle' | 'spinning' | 'revealed' | 'empty';

/** La ruleta de nombres. `stop` 0: gira sin destino; mayor: frena en esa fila (el ganador). */
export interface Reel {
  names: string[];
  stop: number;
}

/** Cuánto tarda la ruleta en frenar sobre el ganador. */
export const REEL_LAND_MS = 4800;
/** Nombres de una vuelta mientras gira; la hoja de estilos da 70 ms a cada uno. */
const LOOP_NAMES = 20;
const MAX_STUBS = 14;

function randomNames(names: string[], length: number, random: () => number): string[] {
  return Array.from({ length }, () => names[Math.floor(random() * names.length)]);
}

/** Vuelta sin fin mientras responde el servidor: la misma tanda dos veces para que no se note el corte. */
export function loopReel(names: string[], random = Math.random): Reel {
  const lap = randomNames(names, LOOP_NAMES, random);
  return { names: [...lap, ...lap], stop: 0 };
}

/** Tira que frena en el ganador: nombres al azar, el ganador en `stop` y un par debajo. */
export function landReel(
  names: string[],
  winner: string,
  stop: number,
  random = Math.random,
): Reel {
  const strip = randomNames(names, stop + 2, random);
  strip[stop] = winner;
  return { names: strip, stop };
}

/** La pantalla del escenario: el premio, la ruleta y el ganador con sus tickets. */
@Component({
  selector: 'app-raffle-screen',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './raffle-screen.scss',
  host: { '[style.--land]': 'landMs' },
  template: `
    <div class="led" [class.is-win]="phase() === 'revealed'">
      <div class="bulbs" aria-hidden="true"></div>
      <p class="led-label">Premio</p>
      <h2 id="raffle-stage-title" class="led-prize">{{ prize() || '¿Qué sorteamos?' }}</h2>

      <div class="led-body">
        @switch (phase()) {
          @case ('spinning') {
            @if (reel().names.length) {
              <!-- La ruleta es adorno: el resultado se anuncia aparte al lector de pantalla. -->
              <div class="reel-window" aria-hidden="true">
                <div class="reel" [class.is-landing]="reel().stop > 0" [style.--stop]="reel().stop">
                  @for (name of reel().names; track $index) {
                    <span class="fit" [style.--len]="name.length">{{ name }}</span>
                  }
                </div>
              </div>
            }
            <p class="led-hint">Sorteando…</p>
          }
          @case ('revealed') {
            <p class="led-cheer">¡Felicidades!</p>
            <p class="winner fit" [style.--len]="winnerName().length">{{ winnerName() }}</p>
            <div class="stubs" aria-hidden="true">
              @for (i of stubs(); track i) {
                <span
                  class="stub"
                  [style.animation-delay]="500 + i * 70 + 'ms, ' + (920 + i * 70) + 'ms'"
                ></span>
              }
              @if (tickets() > stubs().length) {
                <span class="stub-more">+{{ tickets() - stubs().length }}</span>
              }
            </div>
            <p class="led-hint">
              {{ tickets() }} {{ tickets() === 1 ? 'ticket' : 'tickets' }} · tenía {{ chance() }} de
              chance
            </p>
          }
          @case ('empty') {
            <p class="led-idle">Ya no quedan participantes sin premio.</p>
          }
          @default {
            <p class="led-idle is-blinking">¿Quién se lo lleva?</p>
          }
        }
      </div>
      <div class="bulbs" aria-hidden="true"></div>
    </div>
  `,
})
export class RaffleScreen {
  readonly prize = input('');
  readonly phase = input<RafflePhase>('idle');
  readonly reel = input<Reel>({ names: [], stop: 0 });
  readonly winnerName = input('');
  readonly tickets = input(0);
  /** Chance que tenía el ganador, ya como texto ("4,5%"). */
  readonly chance = input('');

  readonly landMs = `${REEL_LAND_MS}ms`;
  /** Un talón por ticket (hasta un tope): caen de a uno al revelar al ganador. */
  readonly stubs = computed(() =>
    Array.from({ length: Math.min(this.tickets(), MAX_STUBS) }, (_, i) => i),
  );
}
