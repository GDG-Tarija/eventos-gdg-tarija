import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../../core/auth/services/auth.service';
import { SUPABASE } from '../../../../core/supabase/supabase.client';
import { StoreSession } from '../store-session';
import { ProductGallery } from './product-gallery';
import { QuantityStepper } from './quantity-stepper';

describe('ProductGallery', () => {
  function render(count: number) {
    const fixture = TestBed.createComponent(ProductGallery);
    fixture.componentRef.setInput('name', 'Polera');
    fixture.componentRef.setInput(
      'images',
      Array.from({ length: count }, (_, i) => ({
        id: `i${i}`,
        url: `https://img.test/${i}.webp`,
        alt: `Foto ${i + 1}`,
      })),
    );
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('navega con flechas del teclado y botones, y anuncia la posición', () => {
    const { fixture, el } = render(3);
    const track = el.querySelector<HTMLElement>('[aria-roledescription="carrusel"]')!;
    track.scrollTo = vi.fn();
    expect(track.tabIndex).toBe(0);
    expect(el.querySelector('.counter')?.textContent?.replace(/\s+/g, '')).toBe('Imagen1/de3');
    track.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();
    expect(el.querySelector('.counter')?.textContent?.replace(/\s+/g, '')).toBe('Imagen2/de3');
    track.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    fixture.detectChanges();
    expect(el.querySelector<HTMLButtonElement>('[aria-label="Imagen siguiente"]')!.disabled).toBe(
      true,
    );
    el.querySelector<HTMLButtonElement>('[aria-label="Imagen anterior"]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('.counter')?.textContent?.replace(/\s+/g, '')).toBe('Imagen2/de3');
    expect([...el.querySelectorAll('img')].map((i) => i.alt)).toEqual([
      'Foto 1',
      'Foto 2',
      'Foto 3',
    ]);
  });

  it('sin imágenes muestra un marcador accesible y sin controles', () => {
    const { el } = render(0);
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('.nav')).toBeNull();
    expect(el.textContent).toContain('Polera sin imagen');
  });

  it('una sola imagen no muestra flechas ni contador', () => {
    const { el } = render(1);
    expect(el.querySelectorAll('img')).toHaveLength(1);
    expect(el.querySelector('.nav, .counter')).toBeNull();
  });
});

describe('QuantityStepper', () => {
  it('en 1 el botón de restar quita el producto; en 5 no deja sumar', () => {
    const fixture = TestBed.createComponent(QuantityStepper);
    fixture.componentRef.setInput('label', 'Taza');
    fixture.componentRef.setInput('value', 1);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const [minus, plus] = el.querySelectorAll('button');
    expect(minus.getAttribute('aria-label')).toBe('Quitar Taza del carrito');
    expect(plus.disabled).toBe(false);
    fixture.componentRef.setInput('value', 5);
    fixture.detectChanges();
    expect(minus.getAttribute('aria-label')).toBe('Quitar una unidad de Taza');
    expect(plus.disabled).toBe(true);
  });
});

describe('StoreSession.checkoutFor', () => {
  it('conserva el intento de compra entre aperturas del diálogo y lo reinicia tras comprar', () => {
    const event = {
      data: { id: 'ev', slug: 's', title: 'T', store_payment_qr_url: 'qr' },
      error: null,
    };
    TestBed.configureTestingModule({
      providers: [
        StoreSession,
        {
          provide: SUPABASE,
          useValue: {
            auth: { onAuthStateChange: vi.fn() },
            from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => event }) }) }),
          },
        },
      ],
    });
    TestBed.inject(AuthService).loading.set(false);
    const session = TestBed.inject(StoreSession);
    expect(session.checkoutFor('u1')).toBeNull();
    session.eventRes.set({ id: 'ev', slug: 's', title: 'T', paymentQrUrl: 'qr' });
    const first = session.checkoutFor('u1');
    expect(first).not.toBeNull();
    expect(session.checkoutFor('u1')).toBe(first);
    session.completePurchase();
    const next = session.checkoutFor('u1');
    expect(next).not.toBe(first);
    expect(session.checkoutFor('u2')).not.toBe(next);
  });
});
