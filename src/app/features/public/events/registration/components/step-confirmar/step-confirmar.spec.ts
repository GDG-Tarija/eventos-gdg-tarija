import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { StepConfirmar } from './step-confirmar';

describe('StepConfirmar', () => {
  it('ofrece la ticketera al recibir la inscripción, incluso mientras se verifica el pago', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(StepConfirmar);
    fixture.componentRef.setInput('step1Data', null);
    fixture.componentRef.setInput('event', { title: 'DevFest' });
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('a[href="/mis-tickets"]')).toBeNull();

    fixture.componentRef.setInput('status', 'PENDING');
    fixture.detectChanges();
    expect(page.textContent).toContain('Estamos verificando tu pago');
    expect(page.querySelector('a[href="/mis-tickets"]')?.textContent).toContain('Ver mis tickets');
    expect(page.querySelector('app-ticket-qr')).toBeNull();
  });
});
