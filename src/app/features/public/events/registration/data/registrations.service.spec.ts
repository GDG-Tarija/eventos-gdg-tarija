import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SUPABASE } from '../../../../../core/supabase/supabase.client';
import { RegistrationsService, TicketSoldOutError } from './registrations.service';

describe('RegistrationsService.validateCoupon', () => {
  const rpc = vi.fn();
  let service: RegistrationsService;

  beforeEach(() => {
    rpc.mockReset();
    TestBed.configureTestingModule({
      providers: [{ provide: SUPABASE, useValue: { rpc } }],
    });
    service = TestBed.inject(RegistrationsService);
  });

  it('devuelve válido con id y rol cuando quedan usos', async () => {
    rpc.mockResolvedValue({ data: [{ id: 'c1', role: 'SPEAKER', max_uses: 5, uses_left: 2 }], error: null });
    const res = await service.validateCoupon('e1', ' ABC ');
    expect(rpc).toHaveBeenCalledWith('validate_coupon', { p_event_id: 'e1', p_code: 'ABC' });
    expect(res).toEqual({ valid: true, id: 'c1', role: 'SPEAKER' });
  });

  it('rechaza un cupón inexistente', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    const res = await service.validateCoupon('e1', 'nope');
    expect(res).toEqual({ valid: false, error: 'Código de invitación no válido o expirado.' });
  });

  it('rechaza un cupón agotado', async () => {
    rpc.mockResolvedValue({ data: [{ id: 'c1', role: 'ATTENDEE', max_uses: 1, uses_left: 0 }], error: null });
    const res = await service.validateCoupon('e1', 'abc');
    expect(res?.valid).toBe(false);
    expect(res?.error).toBe('Este código de invitación ya ha superado el límite de usos permitidos.');
  });

  it('maneja error del RPC', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const res = await service.validateCoupon('e1', 'abc');
    expect(res).toEqual({ valid: false, error: 'Error al verificar el cupón' });
  });

  it('devuelve null con código vacío sin llamar al RPC', async () => {
    expect(await service.validateCoupon('e1', '  ')).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('RegistrationsService.createRegistration', () => {
  const single = vi.fn();
  const from = vi.fn(() => ({ insert: () => ({ select: () => ({ single }) }) }));
  let service: RegistrationsService;

  beforeEach(() => {
    single.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: SUPABASE, useValue: { from } }] });
    service = TestBed.inject(RegistrationsService);
  });

  const payload = { event_id: 'e', user_id: 'u', ticket_type_id: 't', event_role: 'ATTENDEE' as const, payment_proof_url: null, custom_responses: {} };

  it('devuelve el id y el estado creados', async () => {
    single.mockResolvedValue({ data: { id: 'r1', status: 'PENDING' }, error: null });
    expect(await service.createRegistration(payload)).toEqual({ id: 'r1', status: 'PENDING' });
  });

  it('P0010 se traduce a TicketSoldOutError', async () => {
    single.mockResolvedValue({ data: null, error: { code: 'P0010', message: 'agotado' } });
    await expect(service.createRegistration(payload)).rejects.toBeInstanceOf(TicketSoldOutError);
  });

  it('otros errores siguen siendo Error genérico', async () => {
    single.mockResolvedValue({ data: null, error: { code: 'P0011', message: 'fase ajena' } });
    const err = await service.createRegistration(payload).catch((e) => e);
    expect(err).not.toBeInstanceOf(TicketSoldOutError);
    expect(err.message).toContain('P0011');
  });
});
