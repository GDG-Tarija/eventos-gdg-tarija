import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SUPABASE } from '../../../../../core/supabase/supabase.client';
import { TicketTypesService } from './ticket-types.service';

describe('TicketTypesService.listByEventId', () => {
  const eq = vi.fn();
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const rpc = vi.fn();
  let service: TicketTypesService;

  beforeEach(() => {
    eq.mockReset();
    rpc.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: SUPABASE, useValue: { from, rpc } }] });
    service = TestBed.inject(TicketTypesService);
  });

  it('consume get_ticket_availability y mezcla la fase activa', async () => {
    eq.mockResolvedValue({
      data: [{ id: 't1', event_id: 'e1', name: 'General', price: 50, ticket_capacity: null, payment_qr_url: null, image_url: 'https://img/x.png' }],
      error: null,
    });
    rpc.mockResolvedValue({
      data: [
        { ticket_type_id: 't1', ticket_phase_id: 'p1', name: 'Preventa', position: 1, price: 30, payment_qr_url: 'qr', capacity: 5, sold: 5, remaining: 0, is_active: false, package_capacity: null, package_sold: 5 },
        { ticket_type_id: 't1', ticket_phase_id: 'p2', name: 'Normal', position: 2, price: 50, payment_qr_url: 'qr2', capacity: null, sold: 0, remaining: null, is_active: true, package_capacity: null, package_sold: 5 },
      ],
      error: null,
    });

    const [t] = await service.listByEventId('e1');
    expect(rpc).toHaveBeenCalledWith('get_ticket_availability', { p_event_id: 'e1' });
    expect(t.price).toBe(50);
    expect(t.active_phase?.name).toBe('Normal');
    expect(t.phases?.[0].sold_out).toBe(true);
  });

  it('no agrega cache-busting a la imagen', async () => {
    eq.mockResolvedValue({
      data: [{ id: 't1', event_id: 'e1', name: 'G', price: 0, ticket_capacity: null, image_url: 'https://img/x.png' }],
      error: null,
    });
    rpc.mockResolvedValue({ data: [], error: null });
    const [t] = await service.listByEventId('e1');
    expect(t.image_url).toBe('https://img/x.png');
  });

  it('propaga el error del RPC', async () => {
    eq.mockResolvedValue({ data: [], error: null });
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(service.listByEventId('e1')).rejects.toEqual({ message: 'boom' });
  });
});
