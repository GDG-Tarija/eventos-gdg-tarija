import { ChangeDetectionStrategy, Component, inject, resource, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/services/auth.service';
import { RegistrationStatus } from '../../../models/registration.model';
import { googleCalendarUrl } from '../events/data/calendar-link';
import { formatEventDate } from '../events/data/event-timing';
import { TicketQr } from '../events/registration/components/ticket-qr/ticket-qr';
import { MyTicketsService } from './data/my-tickets.service';

@Component({
  selector: 'app-my-tickets',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule, RouterLink, TicketQr],
  templateUrl: './my-tickets.html',
  styleUrl: './my-tickets.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyTickets {
  protected readonly auth = inject(AuthService);
  private readonly myTickets = inject(MyTicketsService);
  protected readonly hiddenQrIds = signal<ReadonlySet<string>>(new Set());

  protected readonly tickets = resource({
    params: () => this.auth.user()?.id,
    loader: ({ params: userId }) => this.myTickets.loadMine(userId),
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
    return `https://wa.me/59179288990?text=${encodeURIComponent(message)}`;
  }
}
