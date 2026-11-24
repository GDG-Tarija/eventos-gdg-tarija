import {
  ChangeDetectionStrategy,
  Component,
  ViewContainerRef,
  computed,
  effect,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from '../../../core/auth/services/auth.service';
import { whatsappSupportUrl } from '../../../core/config/support';
import {
  CheckoutStep,
  StoreCheckoutDialog,
  StoreCheckoutDialogData,
  StoreCheckoutResult,
} from './components/store-checkout-dialog';
import { StoreCart } from './components/store-cart';
import { StoreOrderList } from './components/store-order-list';
import { StoreProductCard } from './components/store-product-card';
import { StoreProductDialog, StoreProductDialogData } from './components/store-product-dialog';
import { formatBs } from './data/money';
import { MAX_PENDING_ORDERS } from './data/store.model';
import { StoreSession } from './store-session';

const DIALOG_BASE = {
  panelClass: 'store-dialog-panel',
  width: '40rem',
  maxWidth: '100vw',
  autoFocus: 'dialog',
  restoreFocus: true,
} as const;

@Component({
  selector: 'app-store-page',
  standalone: true,
  imports: [MatButtonModule, RouterLink, StoreCart, StoreOrderList, StoreProductCard],
  providers: [StoreSession],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './store-page.html',
  styleUrl: './store-page.scss',
})
export class StorePage {
  protected readonly session = inject(StoreSession);
  protected readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly title = inject(Title);
  private readonly route = inject(ActivatedRoute);

  protected readonly slug = toSignal(this.route.paramMap.pipe(map((p) => p.get('slug') ?? '')), {
    initialValue: '',
  });
  protected readonly event = this.session.event;
  protected readonly total = computed(() => formatBs(this.session.totalCents()));
  protected readonly maxPending = MAX_PENDING_ORDERS;
  protected readonly showOrders = computed(
    () => !!this.auth.user() && !!this.event()?.paymentQrUrl,
  );

  constructor() {
    effect(() => this.session.slug.set(this.slug() || null));
    effect(() => {
      const event = this.event();
      this.title.setTitle(event ? `Tienda · ${event.title} | GDG Tarija` : 'Tienda | GDG Tarija');
    });
  }

  protected openProduct(productId: string): void {
    this.dialog.open<StoreProductDialog, StoreProductDialogData>(StoreProductDialog, {
      ...DIALOG_BASE,
      viewContainerRef: this.viewContainerRef,
      data: { productId },
    });
  }

  protected openCheckout(startAt: Exclude<CheckoutStep, 'done'>): void {
    const ref = this.dialog.open<StoreCheckoutDialog, StoreCheckoutDialogData, StoreCheckoutResult>(
      StoreCheckoutDialog,
      {
        ...DIALOG_BASE,
        // Un clic fuera o Esc no deben descartar un pago en curso: el diálogo decide.
        disableClose: true,
        viewContainerRef: this.viewContainerRef,
        data: { startAt },
      },
    );
    ref.afterClosed().subscribe((orderId) => {
      if (orderId) {
        document.getElementById('mis-compras')?.scrollIntoView({ block: 'start' });
      }
    });
  }

  protected supportUrl(): string {
    const user = this.auth.user();
    const who = user ? `Soy ${user.first_name} ${user.last_name} (${user.email}). ` : '';
    return whatsappSupportUrl(
      `¡Hola! ${who}Quiero comprar en la Tienda de "${this.event()?.title ?? ''}" pero mi inscripción figura como anulada.`,
    );
  }
}
