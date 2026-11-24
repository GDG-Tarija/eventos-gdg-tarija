import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../core/auth/services/auth.service';
import { SUPABASE } from '../../../core/supabase/supabase.client';
import { queryStub } from '../store/testing/supabase-query-stub';
import type { TicketRegistrationRow } from './data/my-tickets.service';
import { MyTickets } from './my-tickets';

const { toDataURL } = vi.hoisted(() => ({
  toDataURL: vi.fn(async () => 'data:image/png;base64,AA=='),
}));
vi.mock('qrcode', () => ({ default: { toDataURL } }));

function registration(id: string, status: string, past = false, attended = false) {
  return {
    id,
    status,
    events: {
      id: 'event-' + id, slug: id, title: id, location_name: 'Tarija',
      date_start: past ? '2020-09-01T12:00:00Z' : '2099-09-01T12:00:00Z',
      date_end: null,
    },
    ticket_types: { name: 'Acceso general' },
    session_registrations: [],
    scan_logs: attended ? [{ id: 'check-in' }] : [],
  };
}

function setup(rows: TicketRegistrationRow[], orders: unknown = { data: [], error: null }) {
  const eq = vi.fn().mockResolvedValue({ data: rows, error: null });
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: SUPABASE,
        useValue: {
          auth: { onAuthStateChange: vi.fn() },
          from: (table: string) =>
            table === 'store_orders' ? queryStub(orders).builder : { select: () => ({ eq }) },
        },
      },
    ],
  });
  const auth = TestBed.inject(AuthService);
  auth.user.set({
    id: 'attendee', email: 'attendee@example.test', first_name: 'Ana', last_name: 'Demo',
    avatar_url: null, phone: null, extra_info: null, is_staff: false, created_at: null, updated_at: null,
  });
  auth.loading.set(false);
  const fixture = TestBed.createComponent(MyTickets);
  const page: HTMLElement = fixture.nativeElement;
  return { fixture, page, eq, auth };
}

describe('Mis tickets', () => {
  beforeEach(() => toDataURL.mockClear());

  it('muestra QR con el ID de inscripción solo para entradas próximas confirmadas, y certificado al asistir', async () => {
    const { fixture, page } = setup([
      registration('confirmada', 'CONFIRMED'), registration('pendiente', 'PENDING'),
      registration('anulada', 'CANCELLED'), registration('con-asistencia', 'CONFIRMED', true, true),
      registration('sin-asistencia', 'CONFIRMED', true),
    ]);
    await fixture.whenStable();

    const cards = [...page.querySelectorAll('article')];
    const ticket = (id: string) => cards.find(card => card.querySelector('h3')?.textContent.trim() === id);
    expect(page.querySelectorAll('app-ticket-qr')).toHaveLength(1);
    expect(ticket('confirmada')?.querySelector('app-ticket-qr')).toBeTruthy();
    await vi.waitFor(() => expect(toDataURL).toHaveBeenCalledWith('confirmada', expect.any(Object)));
    expect(ticket('pendiente')?.textContent).toContain('Estamos verificando tu pago');
    expect(ticket('anulada')?.textContent).toContain('Anulada');
    expect(ticket('con-asistencia')?.querySelector('a[href="/certificados/con-asistencia"]')).toBeTruthy();
    expect(ticket('sin-asistencia')?.querySelector('a[href^="/certificados/"]')).toBeNull();
  });

  it('permite reintentar una lectura fallida y muestra la cuenta vacía', async () => {
    const { fixture, page, eq } = setup([]);
    eq.mockRejectedValueOnce(new Error('Sin red'));
    await fixture.whenStable();
    const retry = page.querySelector<HTMLButtonElement>('[role="alert"] button');
    expect(retry).toBeTruthy();
    retry!.click();
    await fixture.whenStable();
    expect(page.textContent).toContain('Todavía no tienes entradas');
    expect(page.querySelector('a[href="/"]')).toBeTruthy();
  });

  it('conserva entradas y certificados propios aunque el evento ya no sea público', async () => {
    const { fixture, page } = setup([
      { ...registration('con-scan', 'CONFIRMED', true, true), events: null },
      { ...registration('pendiente', 'PENDING'), events: null },
    ]);
    await fixture.whenStable();

    const section = page.querySelector('section[aria-labelledby="tickets-unavailable"]');
    expect(section?.querySelectorAll('article')).toHaveLength(2);
    expect(section?.textContent).toContain('Pendiente de verificación');
    expect(section?.querySelector('a[href="/certificados/con-scan"]')).toBeTruthy();
    expect(section?.querySelector('a[href="/certificados/pendiente"]')).toBeNull();
    expect(page.querySelector('app-ticket-qr, a[href^="/e/"], a[href*="calendar.google.com"]')).toBeNull();
    expect(page.textContent).not.toContain('Todavía no tienes entradas');
  });

  it('muestra la fecha de la sesión y cuenta la asistencia fuera del historial', async () => {
    const { fixture, page } = setup([{
      ...registration('devfest', 'CONFIRMED', false, true),
      session_registrations: [{ sessions: { id: 'charla', title: 'Angular', date: '2099-09-02', start_time: '09:00:00', end_time: null } }],
    }]);
    await fixture.whenStable();

    expect(page.querySelector('li')?.textContent).toContain('2 de septiembre · 09:00 · Angular');
    expect(page.textContent).toContain('Has asistido a 1 evento');
    expect(page.querySelector('section[aria-labelledby="tickets-past"]')?.textContent).not.toContain('Has asistido');
  });

  it('permite ocultar un QR sin afectar la otra entrada ni sus acciones', async () => {
    const { fixture, page } = setup([registration('devfest', 'CONFIRMED'), registration('cloud', 'CONFIRMED')]);
    await fixture.whenStable();
    const [first, second] = page.querySelectorAll('article');
    const toggle = first.querySelector<HTMLButtonElement>('button[aria-controls]')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    toggle.click();
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(first.querySelector('app-ticket-qr')).toBeNull();
    expect(second.querySelector('app-ticket-qr')).toBeTruthy();
    expect(first.querySelector('a[href*="calendar.google.com"]')).toBeTruthy();
    toggle.click();
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(first.querySelector('app-ticket-qr')).toBeTruthy();
  });

  it('retira la entrada si se pierde la sesión y conserva la ticketera como destino del login', async () => {
    const { fixture, page, auth } = setup([registration('devfest', 'CONFIRMED')]);
    await fixture.whenStable();
    expect(page.querySelector('app-ticket-qr')).toBeTruthy();

    auth.user.set(null);
    await fixture.whenStable();
    expect(page.querySelector('article')).toBeNull();
    const login = page.querySelector<HTMLAnchorElement>('a[href^="/auth/login"]');
    expect(login).toBeTruthy();
    expect(new URL(login!.href).searchParams.get('returnUrl')).toBe('/mis-tickets');
  });

  it('retira el QR anterior al cambiar de cuenta, incluso mientras carga la nueva', async () => {
    const { fixture, page, eq, auth } = setup([registration('primera-cuenta', 'CONFIRMED')]);
    await fixture.whenStable();
    expect(page.querySelector('app-ticket-qr')).toBeTruthy();

    let finishLoading!: () => void;
    eq.mockReturnValueOnce(new Promise(resolve => {
      finishLoading = () => resolve({ data: [], error: null });
    }));
    auth.user.update(user => user && { ...user, id: 'otra-cuenta' });
    TestBed.tick();
    expect(page.querySelector('app-ticket-qr')).toBeNull();
    finishLoading();
    await fixture.whenStable();
    expect(eq).toHaveBeenLastCalledWith('user_id', 'otra-cuenta');
    expect(page.textContent).toContain('Todavía no tienes entradas');
  });

  it('muestra las compras de la Tienda dentro de su entrada y el acceso a la Tienda', async () => {
    const withStore = {
      ...registration('devfest', 'CONFIRMED'),
      events: {
        ...registration('devfest', 'CONFIRMED').events,
        store_payment_qr_url: 'https://img.test/qr.png',
        store_products: [{ count: 2 }],
      },
    };
    const { fixture, page } = setup([withStore, registration('otro', 'CONFIRMED')], {
      data: [
        {
          id: 'aaaaaaaa-0000-4000-8000-000000000001',
          event_id: 'event-devfest',
          registration_id: 'devfest',
          status: 'PENDING',
          total: '240.00',
          created_at: '2026-11-20T15:30:00Z',
          store_order_items: [
            { id: 'i1', product_name: 'Polera GDG', unit_price: '120.00', quantity: 2, subtotal: '240.00' },
          ],
        },
      ],
      error: null,
    });
    await fixture.whenStable();
    const [devfest, otro] = page.querySelectorAll('article');
    expect(devfest.textContent).toContain('Tus compras en la Tienda');
    expect(devfest.textContent).toContain('2 × Polera GDG');
    expect(devfest.textContent).toContain('En verificación');
    expect(devfest.textContent).toContain('Bs 240');
    expect(devfest.querySelector('a[href="/e/devfest/tienda"]')).toBeTruthy();
    expect(otro.textContent).not.toContain('Tus compras en la Tienda');
    expect(otro.querySelector('a[href$="/tienda"]')).toBeNull();
  });

  it('si fallan las compras, las entradas se siguen viendo y se puede reintentar', async () => {
    const { fixture, page } = setup([registration('devfest', 'CONFIRMED')], {
      data: null,
      error: { message: 'boom', code: 'XX000' },
    });
    await fixture.whenStable();
    expect(page.querySelector('article')).toBeTruthy();
    expect(page.textContent).toContain('No pudimos cargar tus compras de la Tienda');
  });
});
