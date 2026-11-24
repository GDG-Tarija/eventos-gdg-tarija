import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { whatsappSupportUrl } from '../../../../core/config/support';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { formatBs } from '../data/money';
import { STORE_ORDER_STATUS, StoreOrder } from '../data/store.model';

const orderDate = new Intl.DateTimeFormat('es-BO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Compras propias con productos, cantidades, precios registrados, total, fecha y estado.
 * El estado se entiende por icono + texto, no solo por color.
 */
@Component({
  selector: 'app-store-order-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="orders" [class.compact]="compact()" [attr.aria-label]="label()">
      @for (order of orders(); track order.id) {
        @let status = statuses[order.status];
        <li class="order" [attr.aria-label]="'Compra del ' + date(order) + ', ' + status.label">
          <div class="order-head">
            <p class="m-0 text-sm">
              <span class="font-semibold">{{ date(order) }}</span>
              <span class="code">#{{ order.id.slice(0, 8) }}</span>
            </p>
            <span class="status" [attr.data-status]="order.status">
              <span class="material-symbols-rounded" aria-hidden="true">{{ status.icon }}</span>
              {{ status.label }}
            </span>
          </div>
          <ul class="items" aria-label="Productos de la compra">
            @for (item of order.items; track item.id) {
              <li>
                <span class="min-w-0">
                  <span class="qty">{{ item.quantity }} ×</span> {{ item.productName }}
                  <span class="muted unit">({{ bs(item.unitPriceCents) }} c/u)</span>
                </span>
                <span class="tabular-nums">{{ bs(item.subtotalCents) }}</span>
              </li>
            }
          </ul>
          <div class="order-foot">
            <p class="muted m-0 text-xs">{{ status.description }}</p>
            <p class="m-0 font-bold tabular-nums">
              <span class="sr-only">Total </span>{{ bs(order.totalCents) }}
            </p>
          </div>
          @if (order.status === 'CANCELLED') {
            <a class="support" [href]="supportUrl(order)" target="_blank" rel="noopener">
              <span class="material-symbols-rounded" aria-hidden="true">support_agent</span>
              Contactar con soporte
            </a>
          }
        </li>
      }
    </ul>
  `,
  styleUrl: './store-order-list.scss',
})
export class StoreOrderList {
  private readonly auth = inject(AuthService);
  readonly orders = input.required<StoreOrder[]>();
  readonly eventTitle = input.required<string>();
  readonly compact = input(false);
  readonly label = input('Tus compras en la Tienda');

  protected readonly statuses = STORE_ORDER_STATUS;
  protected readonly bs = formatBs;

  protected date(order: StoreOrder): string {
    return orderDate.format(order.createdAt);
  }

  protected supportUrl(order: StoreOrder): string {
    const user = this.auth.user();
    const who = user ? `Soy ${user.first_name} ${user.last_name} (${user.email}). ` : '';
    return whatsappSupportUrl(
      `¡Hola! ${who}Mi compra #${order.id.slice(0, 8)} en la Tienda de "${this.eventTitle()}" figura como anulada y necesito ayuda.`,
    );
  }
}
