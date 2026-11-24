import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../core/auth/services/auth.service';
import { SUPABASE } from '../../../core/supabase/supabase.client';
import { StorePage } from './store-page';
import { queryStub } from './testing/supabase-query-stub';

const EVENT_ID = 'e0000000-0000-4000-8000-000000000001';
const USER_ID = 'u0000000-0000-4000-8000-000000000001';

interface Scenario {
  qr?: string | null;
  products?: unknown[];
  registration?: { status: string } | null;
  orders?: unknown[];
  user?: boolean;
  rpc?: ReturnType<typeof vi.fn>;
}

const productRow = (id: string, name: string, price: string, images = 0) => ({
  id,
  name,
  description: `Descripción de ${name}`,
  price,
  position: 1,
  store_product_images: Array.from({ length: images }, (_, i) => ({
    id: `${id}-img-${i}`,
    url: `https://img.test/${id}-${i}.webp`,
    position: i + 1,
    alt_text: null,
  })),
});

const orderRow = (id: string, status: string, total = '120.00') => ({
  id,
  event_id: EVENT_ID,
  registration_id: 'r1',
  status,
  total,
  created_at: '2026-11-20T15:30:00Z',
  store_order_items: [
    {
      id: `${id}-i`,
      product_name: 'Polera GDG',
      unit_price: '120.00',
      quantity: 1,
      subtotal: '120.00',
    },
  ],
});

async function render(s: Scenario = {}) {
  const tables: Record<string, unknown> = {
    events: {
      data: {
        id: EVENT_ID,
        slug: 'devfest',
        title: 'DevFest Tarija',
        store_payment_qr_url: s.qr === undefined ? 'https://img.test/qr.png' : s.qr,
      },
      error: null,
    },
    store_products: {
      data: s.products ?? [productRow('p1', 'Polera GDG', '120.00', 2)],
      error: null,
    },
    registrations: {
      data: s.registration === undefined ? { id: 'r1', status: 'CONFIRMED' } : s.registration,
      error: null,
    },
    store_orders: { data: s.orders ?? [], error: null },
  };
  const upload = vi.fn(async () => ({ data: { path: 'x' }, error: null }));
  const list = vi.fn(async () => ({ data: [], error: null }));
  const rpc = s.rpc ?? vi.fn(async () => ({ data: 'order-new', error: null, status: 200 }));
  const client = {
    auth: { onAuthStateChange: vi.fn(), signInWithOAuth: vi.fn() },
    from: vi.fn((table: string) => queryStub(tables[table]).builder),
    rpc,
    storage: { from: vi.fn(() => ({ upload, list })) },
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'e/:slug/tienda', component: StorePage }]),
      { provide: SUPABASE, useValue: client },
    ],
  });
  const auth = TestBed.inject(AuthService);
  auth.user.set(
    s.user === false
      ? null
      : {
          id: USER_ID,
          email: 'ana@example.test',
          first_name: 'Ana',
          last_name: 'Demo',
          avatar_url: null,
          phone: null,
          extra_info: null,
          is_staff: false,
          created_at: null,
          updated_at: null,
        },
  );
  auth.loading.set(false);
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/e/devfest/tienda', StorePage);
  await harness.fixture.whenStable();
  harness.detectChanges();
  const page = harness.routeNativeElement as HTMLElement;
  return { harness, page, client, upload, rpc, auth };
}

const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
const button = (root: ParentNode, label: string) =>
  [...root.querySelectorAll<HTMLButtonElement>('button, a')].find((b) => text(b).includes(label));

describe('Tienda del evento', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() =>
    document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = '')),
  );

  it('muestra el catálogo con precio en bolivianos y galería', async () => {
    const { page } = await render({ products: [productRow('p1', 'Polera GDG', '120.50', 3)] });
    expect(text(page.querySelector('h1'))).toBe('Tienda');
    expect(text(page)).toContain('DevFest Tarija');
    const card = page.querySelector('app-store-product-card')!;
    expect(text(card)).toContain('Polera GDG');
    expect(text(card)).toContain('Bs 120,50');
    expect(card.querySelectorAll('img')).toHaveLength(3);
    expect(card.querySelector('[aria-label="Imagen siguiente"]')).toBeTruthy();
  });

  it('carrito: agrega, limita a 5 unidades, calcula el total y permite quitar', async () => {
    const { harness, page } = await render();
    button(page, 'Agregar')!.click();
    harness.detectChanges();
    const plus = page.querySelector<HTMLButtonElement>(
      '[aria-label="Agregar una unidad de Polera GDG"]',
    )!;
    for (let i = 0; i < 6; i++) {
      plus.click();
      harness.detectChanges();
    }
    expect(plus.disabled).toBe(true);
    expect(text(page.querySelector('.cart-bar'))).toContain('Bs 600');
    expect(text(page.querySelector('.cart-bar'))).toContain('5 unidades');
    expect(text(page)).toContain('Máximo 5 por compra');
    expect(JSON.parse(sessionStorage.getItem(`gdg-store-cart:${EVENT_ID}`)!)).toEqual({ p1: 5 });

    button(page.querySelector('app-store-cart')!, 'Quitar')!.click();
    harness.detectChanges();
    expect(page.querySelector('.cart-bar')).toBeNull();
    expect(text(page.querySelector('app-store-cart'))).toContain('Tu carrito está vacío');
  });

  it('recupera el carrito guardado (p. ej. al volver del login) y descarta productos que ya no están', async () => {
    sessionStorage.setItem(`gdg-store-cart:${EVENT_ID}`, JSON.stringify({ p1: 2, retirado: 1 }));
    const { page } = await render();
    expect(text(page.querySelector('.cart-bar'))).toContain('Bs 240');
    expect(text(page)).toContain('Quitamos de tu carrito productos que ya no están disponibles');
  });

  it('anónimo: ve el catálogo y se le invita a iniciar sesión para comprar', async () => {
    const { harness, page, client } = await render({ user: false });
    expect(page.querySelector('app-store-product-card')).toBeTruthy();
    expect(text(page)).toContain('Para comprar, inicia sesión');
    button(page, 'Agregar')!.click();
    harness.detectChanges();
    button(page.querySelector('app-store-cart')!, 'Iniciar sesión para comprar')!.click();
    expect(client.auth.signInWithOAuth).toHaveBeenCalled();
    expect(text(page)).not.toContain('Mis compras');
  });

  it('sin inscripción: puede ver productos pero se le pide inscribirse', async () => {
    const { page } = await render({ registration: null });
    expect(text(page)).toContain('Primero inscríbete al evento');
    const link = button(page, 'Inscribirme')!;
    expect(link.getAttribute('href')).toBe('/e/devfest#registro');
    expect(button(page, 'Continuar al pago')).toBeUndefined();
  });

  it('inscripción anulada: no puede comprar y ve el acceso a soporte', async () => {
    const { page } = await render({ registration: { status: 'CANCELLED' } });
    expect(text(page)).toContain('Tu inscripción está anulada');
    expect(button(page, 'Contactar con soporte')?.getAttribute('href')).toContain('https://wa.me/');
  });

  it('3 compras en verificación: bloquea una nueva compra', async () => {
    const { page } = await render({
      orders: [orderRow('o1', 'PENDING'), orderRow('o2', 'PENDING'), orderRow('o3', 'PENDING')],
    });
    expect(text(page)).toContain('Tienes 3 compras en verificación');
    expect(button(page, 'Continuar al pago')).toBeUndefined();
  });

  it('Tienda sin QR: no muestra catálogo', async () => {
    const { page } = await render({ qr: null });
    expect(text(page)).toContain('La Tienda de este evento no está disponible');
    expect(page.querySelector('app-store-product-card')).toBeNull();
  });

  it('catálogo vacío', async () => {
    const { page } = await render({ products: [] });
    expect(text(page)).toContain('Aún no hay productos en la Tienda');
  });

  it('Mis compras: productos, precios registrados, total, fecha y estado con texto', async () => {
    const { page } = await render({
      orders: [
        orderRow('aaaaaaaa-1', 'PENDING'),
        orderRow('bbbbbbbb-2', 'PAID'),
        orderRow('cccccccc-3', 'CANCELLED'),
      ],
    });
    const section = page.querySelector('#mis-compras')!;
    const orders = [...section.querySelectorAll('.order')];
    expect(orders).toHaveLength(3);
    expect(text(orders[0])).toContain('En verificación');
    expect(text(orders[0])).toContain('Estamos verificando tu pago');
    expect(text(orders[0])).toContain('1 × Polera GDG');
    expect(text(orders[0])).toContain('Bs 120 c/u');
    expect(text(orders[0])).toContain('#aaaaaaaa');
    expect(text(orders[1])).toContain('Pagada');
    expect(text(orders[2])).toContain('Anulada');
    expect(orders[2].querySelector('a[href^="https://wa.me/"]')).toBeTruthy();
    expect(orders[0].querySelector('a[href^="https://wa.me/"]')).toBeNull();
    expect(orders[0].querySelector('.status .material-symbols-rounded')).toBeTruthy();
  });

  it('compra completa: sube el comprobante al bucket privado y crea la compra con el RPC', async () => {
    const created = await render();
    const { harness, page, upload, rpc, client } = created;
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
    button(page, 'Agregar')!.click();
    harness.detectChanges();
    button(page.querySelector('aside')!, 'Continuar al pago')!.click();
    harness.detectChanges();
    await harness.fixture.whenStable();

    const dialog = document.querySelector('app-store-checkout-dialog')!;
    expect(text(dialog)).toContain('Pagar con QR');
    expect(text(dialog)).toContain('Bs 120');
    expect(dialog.querySelector('img[alt="QR de pago de la Tienda del evento"]')).toBeTruthy();
    const confirm = button(dialog, 'Confirmar compra') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);

    const input = dialog.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File([new Uint8Array(10)], 'pago.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', {
      value: { item: () => file, length: 1 },
      configurable: true,
    });
    input.dispatchEvent(new Event('change'));
    harness.detectChanges();
    expect(confirm.disabled).toBe(false);

    confirm.click();
    await vi.waitFor(() =>
      expect(text(document.querySelector('app-store-checkout-dialog'))).toContain(
        'Estamos verificando tu pago',
      ),
    );
    expect(client.storage.from).toHaveBeenCalledWith('store-payment-proofs');
    expect(client.storage.from).not.toHaveBeenCalledWith('payment-proofs');
    const [path] = upload.mock.calls[0] as unknown as [string];
    expect(path).toMatch(new RegExp(`^${USER_ID}/${EVENT_ID}/[0-9a-f-]{36}\\.png$`));
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('create_store_order', {
      p_event_id: EVENT_ID,
      p_items: [{ product_id: 'p1', quantity: 1 }],
      p_payment_proof_path: path,
    });
    expect(sessionStorage.getItem(`gdg-store-cart:${EVENT_ID}`)).toBeNull();
  });

  it('error del servidor (límite de compras pendientes): mensaje claro y sin compra', async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: { code: 'P0057', message: 'x' },
      status: 400,
    }));
    const { harness, page } = await render({ rpc });
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
    button(page, 'Agregar')!.click();
    harness.detectChanges();
    button(page.querySelector('aside')!, 'Continuar al pago')!.click();
    harness.detectChanges();
    const dialog = document.querySelector('app-store-checkout-dialog')!;
    const input = dialog.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File([new Uint8Array(10)], 'pago.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', {
      value: { item: () => file, length: 1 },
      configurable: true,
    });
    input.dispatchEvent(new Event('change'));
    harness.detectChanges();
    (button(dialog, 'Confirmar compra') as HTMLButtonElement).click();
    await vi.waitFor(() =>
      expect(text(dialog.querySelector('[role="alert"]'))).toContain(
        'Ya tienes 3 compras en verificación',
      ),
    );
    expect(text(dialog)).not.toContain('Estamos verificando tu pago');
  });

  it('rechaza un comprobante que no es imagen JPG, PNG o WebP', async () => {
    const { harness, page } = await render();
    button(page, 'Agregar')!.click();
    harness.detectChanges();
    button(page.querySelector('aside')!, 'Continuar al pago')!.click();
    harness.detectChanges();
    const dialog = document.querySelector('app-store-checkout-dialog')!;
    const input = dialog.querySelector<HTMLInputElement>('input[type="file"]')!;
    expect(input.accept).toBe('image/jpeg,image/png,image/webp');
    const file = new File(['%PDF'], 'pago.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', {
      value: { item: () => file, length: 1 },
      configurable: true,
    });
    input.dispatchEvent(new Event('change'));
    harness.detectChanges();
    expect(text(dialog)).toContain('Usa una imagen JPG, PNG o WebP');
    expect((button(dialog, 'Confirmar compra') as HTMLButtonElement).disabled).toBe(true);
  });
});
