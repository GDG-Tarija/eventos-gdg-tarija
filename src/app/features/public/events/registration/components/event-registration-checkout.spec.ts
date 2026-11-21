import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import { SUPABASE } from '../../../../../core/supabase/supabase.client';
import { EventRegistrationCheckout } from './event-registration-checkout';

describe('EventRegistrationCheckout', () => {
  it('ofrece el futuro QR de una inscripción pendiente solo mientras el evento siga vigente', async () => {
    const onAuthStateChange = vi.fn();
    const query = {
      data: [],
      error: null,
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'inscripcion', status: 'PENDING' }, error: null }),
    };
    const supabase = {
      auth: { onAuthStateChange },
      from: () => query,
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: SUPABASE, useValue: supabase }] });
    const fixture = TestBed.createComponent(EventRegistrationCheckout);
    const oneDay = 24 * 60 * 60 * 1000;
    const event = { id: 'devfest', date_start: new Date(Date.now() + oneDay) };
    fixture.componentRef.setInput('event', event);
    onAuthStateChange.mock.calls[0][0]('INITIAL_SESSION', { user: { id: 'asistente', user_metadata: {} } });
    const page = fixture.nativeElement as HTMLElement;

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(page.textContent).toContain('Tu QR estará disponible cuando se confirme.');
    });
    expect(page.querySelector('app-ticket-qr')).toBeNull();

    fixture.componentRef.setInput('event', { ...event, date_start: new Date(Date.now() - oneDay) });
    fixture.detectChanges();
    expect(page.textContent).toContain('Este evento ya terminó');
    expect(page.textContent).toContain('Estamos verificando tu pago.');
    expect(page.textContent).not.toContain('Tu QR estará disponible');
    expect(page.querySelector('a[href="/mis-tickets"]')).toBeTruthy();
  });
});
