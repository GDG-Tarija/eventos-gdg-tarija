import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SUPABASE } from '../../../../../core/supabase/supabase.client';
import { RegistrationsService } from './registrations.service';

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
