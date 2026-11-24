import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { MAX_UNITS } from '../data/store.model';

/** Selector de unidades (1..5). En 1, el botón de restar quita el producto del carrito. */
@Component({
  selector: 'app-quantity-stepper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stepper" role="group" [attr.aria-label]="'Cantidad de ' + label()">
      <button
        type="button"
        class="stepper-btn"
        [attr.aria-label]="
          value() <= 1 ? 'Quitar ' + label() + ' del carrito' : 'Quitar una unidad de ' + label()
        "
        (click)="decrement.emit()"
      >
        <span class="material-symbols-rounded" aria-hidden="true">{{
          value() <= 1 ? 'delete' : 'remove'
        }}</span>
      </button>
      <span class="stepper-value">{{ value() }}</span>
      <button
        type="button"
        class="stepper-btn"
        [disabled]="value() >= max()"
        [attr.aria-label]="'Agregar una unidad de ' + label()"
        (click)="increment.emit()"
      >
        <span class="material-symbols-rounded" aria-hidden="true">add</span>
      </button>
    </div>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .stepper {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.125rem;
      border-radius: 100vmax;
      border: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface-container-lowest);
    }
    .stepper-btn {
      display: grid;
      place-items: center;
      width: 2.75rem;
      height: 2.75rem;
      border: 0;
      border-radius: 100vmax;
      background: transparent;
      color: var(--mat-sys-primary);
      cursor: pointer;
      transition:
        background-color 150ms cubic-bezier(0.23, 1, 0.32, 1),
        transform 150ms cubic-bezier(0.23, 1, 0.32, 1);
    }
    .stepper-btn:hover:not(:disabled) {
      background: color-mix(in srgb, var(--mat-sys-primary) 10%, transparent);
    }
    @media (prefers-reduced-motion: no-preference) {
      .stepper-btn:active:not(:disabled) {
        transform: scale(0.94);
      }
    }
    .stepper-btn:focus-visible {
      outline: 2px solid var(--mat-sys-primary);
      outline-offset: 2px;
    }
    .stepper-btn:disabled {
      color: var(--mat-sys-on-surface-variant);
      opacity: 0.45;
      cursor: not-allowed;
    }
    .stepper-value {
      display: inline-block;
      min-width: 1.5rem;
      text-align: center;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--mat-sys-on-surface);
    }
  `,
})
export class QuantityStepper {
  readonly value = input.required<number>();
  readonly label = input.required<string>();
  readonly max = input(MAX_UNITS);
  readonly increment = output<void>();
  readonly decrement = output<void>();
}
