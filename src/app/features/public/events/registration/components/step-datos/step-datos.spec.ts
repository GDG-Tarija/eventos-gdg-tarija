import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
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

function setup(tickets: TicketType[] = [ticket]) {
  const open = vi.fn();
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
    const messages: string[] = open.mock.calls[0][1].data.messages;
    expect(messages).toEqual(
      expect.arrayContaining([
        'Ingresa tus nombres',
        'Ingresa tus apellidos',
        'El celular es obligatorio',
        'El campo "Universidad" es obligatorio',
        'Debes marcar la casilla "Términos"',
        'Sube el comprobante de pago.',
      ]),
    );
  });

  it('pide elegir un pase cuando hay más de uno y ninguno está elegido', () => {
    const { component, open } = setup([ticket, { ...ticket, id: 't2', name: 'VIP' }]);

    component.onContinuar();

    const messages: string[] = open.mock.calls[0][1].data.messages;
    expect(messages).toContain('Elige un pase (entrada).');
  });

  it('marca como tocados los campos para mostrar su error en línea', () => {
    const { component } = setup();

    component.onContinuar();

    expect(component.checkoutForm.firstName().touched()).toBe(true);
    expect(component.checkoutForm.responses['uni']().touched()).toBe(true);
  });

  it('pide el comprobante cuando el pase es de pago', () => {
    const { component, open } = setup();
    component.formData.set({
      firstName: 'Ana',
      lastName: 'Pérez',
      phone: '70000000',
      responses: { uni: 'UCB', terms: true },
    });
    component.selectTicket(ticket);

    component.onContinuar();

    const messages: string[] = open.mock.calls[0][1].data.messages;
    expect(messages).toEqual(['Sube el comprobante de pago.']);
  });
});
