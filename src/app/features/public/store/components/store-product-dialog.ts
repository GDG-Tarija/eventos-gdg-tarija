import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { formatBs } from '../data/money';
import { MAX_UNITS } from '../data/store.model';
import { StoreSession } from '../store-session';
import { ProductGallery } from './product-gallery';
import { QuantityStepper } from './quantity-stepper';

export interface StoreProductDialogData {
  productId: string;
}

@Component({
  selector: 'app-store-product-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, ProductGallery, QuantityStepper],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="store-dialog">
      <header class="dialog-header">
        <h2 mat-dialog-title class="m-0 min-w-0 truncate text-lg font-bold">
          {{ product()?.name ?? 'Producto' }}
        </h2>
        <button type="button" class="icon-btn" aria-label="Cerrar" (click)="ref.close()">
          <span class="material-symbols-rounded" aria-hidden="true">close</span>
        </button>
      </header>
      <div class="dialog-body">
        @if (product(); as p) {
          <app-product-gallery [images]="p.images" [name]="p.name" variant="detail" />
          <div class="mt-5 flex items-baseline justify-between gap-3">
            <p class="m-0 text-sm font-semibold muted">Precio por unidad</p>
            <p class="price m-0 text-2xl font-bold">{{ price() }}</p>
          </div>
          @if (p.description) {
            <p class="mt-4 mb-0 whitespace-pre-line text-sm leading-relaxed sm:text-base">
              {{ p.description }}
            </p>
          }
        } @else {
          <p class="muted m-0" role="status">Este producto ya no está disponible.</p>
        }
      </div>
      @if (product(); as p) {
        <footer class="dialog-footer">
          @if (quantity() === 0) {
            <button
              mat-flat-button
              type="button"
              class="gdg-btn-filled footer-btn w-full sm:w-auto"
              (click)="session.add(p.id, p.name)"
            >
              <span class="material-symbols-rounded text-lg" aria-hidden="true"
                >add_shopping_cart</span
              >
              Agregar al carrito
            </button>
          } @else {
            <div class="flex w-full flex-wrap items-center justify-between gap-3">
              <p class="m-0 text-sm font-semibold">
                En tu carrito
                <span class="muted block text-xs font-normal"
                  >Hasta {{ max }} unidades por compra</span
                >
              </p>
              <app-quantity-stepper
                [value]="quantity()"
                [label]="p.name"
                (increment)="session.add(p.id, p.name)"
                (decrement)="session.decrease(p.id, p.name)"
              />
            </div>
          }
        </footer>
      }
    </div>
  `,
  styleUrl: './store-dialog.scss',
})
export class StoreProductDialog {
  protected readonly ref = inject(MatDialogRef<StoreProductDialog>);
  protected readonly session = inject(StoreSession);
  private readonly data = inject<StoreProductDialogData>(MAT_DIALOG_DATA);
  protected readonly max = MAX_UNITS;
  protected readonly product = computed(
    () => this.session.products().find((p) => p.id === this.data.productId) ?? null,
  );
  protected readonly quantity = computed(() => this.session.quantityOf(this.data.productId));
  protected readonly price = computed(() => formatBs(this.product()?.priceCents ?? 0));
}
