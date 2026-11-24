import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/services/auth.service';
import { formatBs } from '../data/money';
import { MAX_PENDING_ORDERS } from '../data/store.model';
import { StoreSession } from '../store-session';
import { QuantityStepper } from './quantity-stepper';

/** Carrito editable + total + acción principal según quién mira la Tienda. */
@Component({
  selector: 'app-store-cart',
  standalone: true,
  imports: [MatButtonModule, RouterLink, QuantityStepper],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (session.lines().length === 0) {
      <div class="empty">
        <span class="material-symbols-rounded" aria-hidden="true">shopping_bag</span>
        <p class="m-0 text-sm">Tu carrito está vacío. Agrega productos para armar tu compra.</p>
      </div>
    } @else {
      <ul class="lines" aria-label="Productos en tu carrito">
        @for (line of session.lines(); track line.product.id) {
          <li class="line">
            <div class="min-w-0">
              <p class="m-0 font-semibold leading-snug">{{ line.product.name }}</p>
              <p class="muted m-0 text-xs">{{ bs(line.product.priceCents) }} c/u</p>
              <button
                type="button"
                class="remove-btn"
                (click)="session.remove(line.product.id, line.product.name)"
              >
                Quitar<span class="sr-only"> {{ line.product.name }}</span>
              </button>
            </div>
            <div class="flex flex-col items-end gap-1">
              <app-quantity-stepper
                [value]="line.quantity"
                [label]="line.product.name"
                (increment)="session.add(line.product.id, line.product.name)"
                (decrement)="session.decrease(line.product.id, line.product.name)"
              />
              <p class="m-0 text-sm font-bold tabular-nums">{{ bs(line.subtotalCents) }}</p>
            </div>
          </li>
        }
      </ul>
      <div class="total">
        <p class="m-0 font-semibold">
          Total
          <span class="muted block text-xs font-normal">
            {{ session.units() }} {{ session.units() === 1 ? 'unidad' : 'unidades' }}
          </span>
        </p>
        <p class="m-0 text-2xl font-bold tabular-nums" aria-live="polite">{{ total() }}</p>
      </div>
    }

    <div class="cta">
      @switch (session.access()) {
        @case ('can-buy') {
          <button
            mat-flat-button
            type="button"
            class="gdg-btn-filled cta-btn w-full"
            [disabled]="session.lines().length === 0"
            (click)="checkout.emit()"
          >
            Continuar al pago
          </button>
        }
        @case ('anonymous') {
          <p class="muted m-0 text-xs">
            Inicia sesión con Google para comprar. Tu carrito se guarda.
          </p>
          <button
            mat-flat-button
            type="button"
            class="gdg-btn-filled cta-btn w-full"
            (click)="auth.signInWithGoogle()"
          >
            Iniciar sesión para comprar
          </button>
        }
        @case ('not-registered') {
          <p class="muted m-0 text-xs">
            Solo pueden comprar las personas inscritas en el evento. Tu carrito se guarda.
          </p>
          <a
            mat-flat-button
            class="gdg-btn-filled cta-btn w-full"
            [routerLink]="['/e', slug()]"
            fragment="registro"
          >
            Inscribirme al evento
          </a>
        }
        @case ('cancelled') {
          <p class="notice m-0 text-xs" role="status">
            Tu inscripción a este evento está anulada, por eso no puedes comprar.
          </p>
        }
        @case ('pending-limit') {
          <p class="notice m-0 text-xs" role="status">
            Tienes {{ maxPending }} compras en verificación. Podrás hacer otra cuando validemos
            alguna.
          </p>
        }
        @case ('check-failed') {
          <p class="notice m-0 text-xs" role="alert">No pudimos comprobar tu inscripción.</p>
          <button
            mat-stroked-button
            type="button"
            class="cta-btn w-full"
            (click)="session.registrationRes.reload()"
          >
            Reintentar
          </button>
        }
        @default {
          <button mat-flat-button type="button" class="gdg-btn-filled cta-btn w-full" disabled>
            Comprobando tu inscripción…
          </button>
        }
      }
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      color: var(--mat-sys-on-surface);
    }
    .muted {
      color: var(--mat-sys-on-surface-variant);
    }
    .empty {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      border-radius: 1rem;
      background: var(--mat-sys-surface-container);
      color: var(--mat-sys-on-surface-variant);
    }
    .lines {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .line {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      overflow-wrap: anywhere;
    }
    .line:first-child {
      padding-top: 0;
    }
    .remove-btn {
      min-height: 2.75rem;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--mat-sys-error);
      font: inherit;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
    }
    .remove-btn:hover {
      text-decoration: underline;
    }
    .remove-btn:focus-visible {
      outline: 2px solid var(--mat-sys-primary);
      outline-offset: 2px;
      border-radius: 0.25rem;
    }
    .total {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
    }
    .tabular-nums {
      font-variant-numeric: tabular-nums;
    }
    .cta {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .cta-btn {
      min-height: 3rem;
    }
    .notice {
      padding: 0.75rem;
      border-radius: 0.75rem;
      background: var(--mat-sys-surface-container);
      color: var(--mat-sys-on-surface);
    }
  `,
})
export class StoreCart {
  protected readonly session = inject(StoreSession);
  protected readonly auth = inject(AuthService);
  readonly checkout = output<void>();
  protected readonly maxPending = MAX_PENDING_ORDERS;
  protected readonly bs = formatBs;
  protected readonly total = computed(() => formatBs(this.session.totalCents()));
  protected readonly slug = computed(() => this.session.event()?.slug ?? '');
}
