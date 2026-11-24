import { Injectable, computed, effect, inject, resource, signal, untracked } from '@angular/core';

import { AuthService } from '../../../core/auth/services/auth.service';
import { RegistrationsService } from '../events/registration/data/registrations.service';
import {
  addOne,
  Cart,
  cartLines,
  cartTotalCents,
  cartUnits,
  loadCart,
  reconcileCart,
  removeOne,
  removeProduct,
  saveCart,
  setQuantity,
} from './data/store-cart';
import { StoreCheckout } from './data/store-checkout';
import { MAX_PENDING_ORDERS } from './data/store.model';
import { StoreService } from './data/store.service';

/**
 * Quién puede comprar. Es solo UX: create_store_order y la política del bucket vuelven a
 * comprobar sesión, inscripción activa, evento publicado con QR y límites.
 */
export type StoreAccess =
  | 'loading'
  | 'store-disabled'
  | 'anonymous'
  | 'check-failed'
  | 'not-registered'
  | 'cancelled'
  | 'pending-limit'
  | 'can-buy';

/** Estado de la Tienda de un evento, compartido por la página y sus diálogos (ámbito de página). */
@Injectable()
export class StoreSession {
  private readonly auth = inject(AuthService);
  private readonly store = inject(StoreService);
  private readonly registrations = inject(RegistrationsService);

  readonly slug = signal<string | null>(null);

  readonly eventRes = resource({
    params: () => this.slug() ?? undefined,
    loader: ({ params }) => this.store.getEvent(params),
  });
  readonly event = computed(() => (this.eventRes.hasValue() ? this.eventRes.value() : null));

  readonly productsRes = resource({
    params: () => this.event()?.id,
    loader: ({ params }) => this.store.listProducts(params),
  });
  readonly products = computed(() => (this.productsRes.hasValue() ? this.productsRes.value() : []));

  private readonly buyerParams = computed(() => {
    const eventId = this.event()?.id;
    const userId = this.auth.user()?.id;
    return eventId && userId ? { eventId, userId } : undefined;
  });

  readonly registrationRes = resource({
    params: this.buyerParams,
    loader: ({ params }) => this.registrations.getByEventAndUser(params.eventId, params.userId),
  });

  readonly ordersRes = resource({
    params: this.buyerParams,
    loader: ({ params }) => this.store.listMyOrders(params.userId, params.eventId),
  });
  readonly orders = computed(() => (this.ordersRes.hasValue() ? this.ordersRes.value() : []));
  readonly pendingCount = computed(
    () => this.orders().filter((o) => o.status === 'PENDING').length,
  );

  readonly cart = signal<Cart>({});
  readonly lines = computed(() => cartLines(this.cart(), this.products()));
  readonly totalCents = computed(() => cartTotalCents(this.lines()));
  readonly units = computed(() => cartUnits(this.lines()));

  /** Comprobante elegido; se conserva si el diálogo de pago se cierra y se vuelve a abrir. */
  readonly proofFile = signal<File | null>(null);
  private checkoutState: { key: string; checkout: StoreCheckout } | null = null;

  /** Aviso accesible (aria-live) de la última acción sobre el carrito. */
  readonly announcement = signal('');
  /** Productos que se quitaron del carrito porque dejaron de estar disponibles. */
  readonly removedNotice = signal(false);

  readonly access = computed<StoreAccess>(() => {
    const event = this.event();
    if (!event) return 'loading';
    if (!event.paymentQrUrl) return 'store-disabled';
    if (this.auth.loading()) return 'loading';
    if (!this.auth.user()) return 'anonymous';
    if (this.registrationRes.error()) return 'check-failed';
    if (!this.registrationRes.hasValue()) return 'loading';
    const registration = this.registrationRes.value();
    if (!registration) return 'not-registered';
    if (registration.status === 'CANCELLED') return 'cancelled';
    if (this.pendingCount() >= MAX_PENDING_ORDERS) return 'pending-limit';
    return 'can-buy';
  });

  constructor() {
    effect(() => {
      const eventId = this.event()?.id;
      if (eventId) untracked(() => this.cart.set(loadCart(eventId)));
    });
    // Con el catálogo cargado, el carrito solo conserva productos que siguen disponibles.
    effect(() => {
      if (!this.productsRes.hasValue()) return;
      const products = this.productsRes.value();
      untracked(() => {
        const { cart, removed } = reconcileCart(this.cart(), products);
        if (removed > 0) {
          this.removedNotice.set(true);
          this.commit(cart);
        }
      });
    });
  }

  /**
   * Intento de compra en curso del usuario. Vive con la página (no con el diálogo) para reutilizar
   * el comprobante ya subido si el diálogo se cierra antes de confirmar.
   */
  checkoutFor(userId: string): StoreCheckout | null {
    const eventId = this.event()?.id;
    if (!eventId) return null;
    const key = `${eventId}:${userId}`;
    if (this.checkoutState?.key !== key) {
      this.checkoutState = { key, checkout: new StoreCheckout(this.store, { eventId, userId }) };
    }
    return this.checkoutState.checkout;
  }

  /** Tras una compra creada: carrito vacío y el próximo intento empieza de cero. */
  completePurchase(): void {
    this.checkoutState = null;
    this.proofFile.set(null);
    this.clearCart();
    this.ordersRes.reload();
  }

  quantityOf(productId: string): number {
    return this.cart()[productId] ?? 0;
  }

  add(productId: string, name: string): void {
    this.commit(addOne(this.cart(), productId));
    this.announcement.set(`${name}: ${this.quantityOf(productId)} en tu carrito`);
  }

  decrease(productId: string, name: string): void {
    this.commit(removeOne(this.cart(), productId));
    const left = this.quantityOf(productId);
    this.announcement.set(left ? `${name}: ${left} en tu carrito` : `Quitaste ${name} del carrito`);
  }

  setUnits(productId: string, quantity: number): void {
    this.commit(setQuantity(this.cart(), productId, quantity));
  }

  remove(productId: string, name: string): void {
    this.commit(removeProduct(this.cart(), productId));
    this.announcement.set(`Quitaste ${name} del carrito`);
  }

  clearCart(): void {
    this.commit({});
  }

  private commit(cart: Cart): void {
    this.cart.set(cart);
    const eventId = this.event()?.id;
    if (eventId) saveCart(eventId, cart);
  }
}
