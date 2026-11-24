import { ChangeDetectionStrategy, Component, computed, inject, resource, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/services/auth.service';
import { whatsappSupportUrl } from '../../../core/config/support';
import { RegistrationStatus } from '../../../models/registration.model';
import { googleCalendarUrl } from '../events/data/calendar-link';
import { formatEventDate } from '../events/data/event-timing';
import { TicketQr } from '../events/registration/components/ticket-qr/ticket-qr';
import { StoreOrderList } from '../store/components/store-order-list';
import { StoreOrder } from '../store/data/store.model';
import { StoreService } from '../store/data/store.service';
import { MyTicketsService } from './data/my-tickets.service';

@Component({
  selector: 'app-my-tickets',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterLink,
    StoreOrderList,
    TicketQr,
  ],
  templateUrl: './my-tickets.html',
  styleUrl: './my-tickets.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyTickets {
  protected readonly auth = inject(AuthService);
  private readonly myTickets = inject(MyTicketsService);
  private readonly store = inject(StoreService);
  protected readonly hiddenQrIds = signal<ReadonlySet<string>>(new Set());

  protected readonly tickets = resource({
    params: () => this.auth.user()?.id,
    loader: ({ params: userId }) => this.myTickets.loadMine(userId),
  });

  /** Compras de la Tienda; se cargan aparte para que un fallo no oculte las entradas. */
  protected readonly orders = resource({
    params: () => this.auth.user()?.id,
    loader: ({ params: userId }) => this.store.listMyOrders(userId),
  });

  /** Compras agrupadas por inscripción (cada compra pertenece a una inscripción). */
  protected readonly ordersByRegistration = computed(() => {
    const byRegistration = new Map<string, StoreOrder[]>();
    if (!this.orders.hasValue()) return byRegistration;
    for (const order of this.orders.value()) {
      const list = byRegistration.get(order.registrationId) ?? [];
      list.push(order);
      byRegistration.set(order.registrationId, list);
    }
    return byRegistration;
  });

  protected readonly sections = [
    { key: 'upcoming', title: 'Próximos eventos', empty: 'No tienes entradas para próximos eventos.' },
    { key: 'past', title: 'Eventos pasados', empty: 'Aún no tienes eventos pasados.' },
  ] as const;

  protected readonly statuses: Record<RegistrationStatus, { label: string; icon: string }> = {
    CONFIRMED: { label: 'Confirmada', icon: 'check_circle' },
    PENDING: { label: 'Pendiente de verificación', icon: 'schedule' },
    CANCELLED: { label: 'Anulada', icon: 'cancel' },
  };
  protected readonly formatDate = formatEventDate;
  protected readonly calendarUrl = googleCalendarUrl;

  protected toggleQr(id: string): void {
    this.hiddenQrIds.update((hidden) => {
      const next = new Set(hidden);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected supportUrl(eventTitle: string): string {
    const user = this.auth.user();
    const message = `¡Hola! Soy ${user?.first_name} ${user?.last_name} (${user?.email}). Mi inscripción a "${eventTitle}" figura como anulada y necesito ayuda.`;
    return whatsappSupportUrl(message);
  }
}
