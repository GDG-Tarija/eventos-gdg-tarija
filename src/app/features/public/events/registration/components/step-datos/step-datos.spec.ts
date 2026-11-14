import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../../../../core/auth/services/auth.service';
import { TicketType } from '../../../../../../models/ticket.model';
import type { Event as EventModel } from '../../../data/event.model';
import { RegistrationsService } from '../../data/registrations.service';
import { StepDatos } from './step-datos';

const ticket: TicketType = {
  id: 't1',
  event_id: 'e1',
  name: 'General',
  price: 20,
  ticket_capacity: 10,
};

// jsdom no implementa scrollIntoView ni matchMedia.
Element.prototype.scrollIntoView = vi.fn();
window.matchMedia = vi.fn(() => ({ matches: false })) as unknown as typeof window.matchMedia;

function setup(tickets: TicketType[] = [ticket]) {
  const open = vi.fn(() => ({ afterClosed: () => of(undefined) }));
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: { user: signal(null) } },
      { provide: RegistrationsService, useValue: { validateCoupon: vi.fn() } },
      { provide: MatDialog, useValue: { open } },
    ],
  });
  const fixture = TestBed.createComponent(StepDatos);
  fixture.componentRef.setInput('event', {
    id: 'e1',
    extra_info: {
      form_fields: [
        {
          key: 'uni',
          label: 'Universidad',
          type: 'text',
          required: true,
          placeholder: null,
          options: null,
        },
        {
          key: 'terms',
          label: 'Términos',
          type: 'checkbox',
          required: true,
          placeholder: null,
          options: null,
        },
      ],
    },
  } as unknown as EventModel);
  fixture.componentRef.setInput('tickets', tickets);
  fixture.detectChanges();
  const emitted = vi.fn();
  fixture.componentInstance.stepComplete.subscribe(emitted);
  return { component: fixture.componentInstance, open, emitted };
}

describe('StepDatos.onContinuar', () => {
  it('abre el diálogo con todo lo que falta y no avanza', () => {
    const { component, open, emitted } = setup();

    component.onContinuar();

    expect(emitted).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledTimes(1);
    const messages: string[] = (
      open.mock.calls[0] as unknown as [unknown, { data: { messages: string[] } }]
    )[1].data.messages;
    expect(messages).toEqual(
      expect.arrayContaining([
        'Escribe tus nombres',
        'Escribe tus apellidos',
        'Ingresa tu celular',
        'El campo "Universidad" es obligatorio',
        'Debes marcar la casilla "Términos"',
        'Sube el comprobante de pago.',
      ]),
    );
  });

  it('pide elegir una entrada cuando hay más de uno y ninguno está elegido', () => {
    const { component, open } = setup([ticket, { ...ticket, id: 't2', name: 'VIP' }]);

    component.onContinuar();

    const messages: string[] = (
      open.mock.calls[0] as unknown as [unknown, { data: { messages: string[] } }]
    )[1].data.messages;
    expect(messages).toContain('Elige una entrada.');
  });

  it('marca como tocados los campos para mostrar su error en línea', () => {
    const { component } = setup();

    component.onContinuar();

    expect(component.checkoutForm.firstName().touched()).toBe(true);
    expect(component.checkoutForm.responses['uni']().touched()).toBe(true);
  });

  it('pide el comprobante cuando la entrada es de pago', () => {
    const { component, open } = setup();
    component.formData.set({
      firstName: 'Ana',
      lastName: 'Pérez',
      phone: '70000000',
      responses: { uni: 'UCB', terms: true },
    });
    component.selectTicket(ticket);

    component.onContinuar();

    const messages: string[] = (
      open.mock.calls[0] as unknown as [unknown, { data: { messages: string[] } }]
    )[1].data.messages;
    expect(messages).toEqual(['Sube el comprobante de pago.']);
  });

  it('rechaza nombres en blanco o largos y celulares inválidos', () => {
    const { component } = setup();
    component.formData.update((d) => ({
      ...d,
      firstName: '   ',
      lastName: 'x'.repeat(61),
      phone: '12345',
    }));

    expect(component.checkoutForm.firstName().errors()[0]?.message).toBe('Escribe tus nombres');
    expect(component.checkoutForm.lastName().errors()[0]?.message).toBe('Máximo 60 caracteres');
    expect(component.checkoutForm.phone().errors()[0]?.message).toContain('8 dígitos');
  });

  it('emite el celular normalizado', () => {
    const { component, emitted } = setup([{ ...ticket, price: 0 }]);
    component.formData.set({
      firstName: ' Ana ',
      lastName: 'Pérez',
      phone: '+591 7123-4567',
      responses: { uni: 'UCB', terms: true },
    });

    component.onContinuar();

    expect(emitted.mock.calls[0][0].phone).toBe('+59171234567');
  });
});
