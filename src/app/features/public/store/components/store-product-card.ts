import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { formatBs } from '../data/money';
import { MAX_UNITS, StoreProduct } from '../data/store.model';
import { StoreSession } from '../store-session';
import { ProductGallery } from './product-gallery';
import { QuantityStepper } from './quantity-stepper';

@Component({
  selector: 'app-store-product-card',
  standalone: true,
  imports: [MatButtonModule, ProductGallery, QuantityStepper],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="product-card" [attr.aria-labelledby]="'product-' + product().id">
      <app-product-gallery [images]="product().images" [name]="product().name" />
      <div class="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        <div class="flex items-start justify-between gap-3">
          <h3 [id]="'product-' + product().id" class="m-0 text-lg font-bold leading-snug">
            {{ product().name }}
          </h3>
          <p class="price m-0 shrink-0 text-lg font-bold">{{ price() }}</p>
        </div>
        @if (product().description) {
          <p class="muted m-0 line-clamp-2 text-sm leading-relaxed">{{ product().description }}</p>
        }
        <button type="button" class="details-link" (click)="details.emit()">
          Ver detalles<span class="sr-only"> de {{ product().name }}</span>
          <span class="material-symbols-rounded text-base" aria-hidden="true">arrow_forward</span>
        </button>
        <div class="mt-auto pt-2">
          @if (quantity() === 0) {
            <button
              mat-flat-button
              type="button"
              class="gdg-btn-filled add-btn w-full"
              (click)="session.add(product().id, product().name)"
            >
              <span class="material-symbols-rounded text-lg" aria-hidden="true"
                >add_shopping_cart</span
              >
              Agregar<span class="sr-only"> {{ product().name }} al carrito</span>
            </button>
          } @else {
            <div class="in-cart flex items-center justify-between gap-3">
              <p class="m-0 text-sm font-semibold leading-tight">
                En tu carrito
                @if (quantity() >= max) {
                  <span class="muted block text-xs font-normal">Máximo {{ max }} por compra</span>
                }
              </p>
              <app-quantity-stepper
                [value]="quantity()"
                [label]="product().name"
                (increment)="session.add(product().id, product().name)"
                (decrement)="session.decrease(product().id, product().name)"
              />
            </div>
          }
        </div>
      </div>
    </article>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
    .product-card {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      overflow-wrap: anywhere;
      border-radius: 1.5rem;
      border: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface-container-lowest);
      color: var(--mat-sys-on-surface);
      box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
    }
    .price {
      color: var(--mat-sys-primary);
      font-variant-numeric: tabular-nums;
    }
    .muted {
      color: var(--mat-sys-on-surface-variant);
    }
    .details-link {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      align-self: flex-start;
      min-height: 2.75rem;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--mat-sys-primary);
      font: inherit;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      text-underline-offset: 0.2em;
    }
    .details-link:hover {
      text-decoration: underline;
    }
    .details-link:focus-visible {
      outline: 2px solid var(--mat-sys-primary);
      outline-offset: 2px;
      border-radius: 0.25rem;
    }
    .add-btn {
      min-height: 2.75rem;
    }
  `,
})
export class StoreProductCard {
  protected readonly session = inject(StoreSession);
  readonly product = input.required<StoreProduct>();
  readonly details = output<void>();
  protected readonly max = MAX_UNITS;
  protected readonly quantity = computed(() => this.session.quantityOf(this.product().id));
  protected readonly price = computed(() => formatBs(this.product().priceCents));
}
