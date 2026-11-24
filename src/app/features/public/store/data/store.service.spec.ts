import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SUPABASE } from '../../../../core/supabase/supabase.client';
import { callsTo, queryStub, QueryStub } from '../testing/supabase-query-stub';
import { StoreError } from './store-errors';
import { buildProofPath, STORE_PROOFS_BUCKET, StoreService } from './store.service';

const USER = '11111111-1111-4111-8111-111111111111';
const EVENT = '22222222-2222-4222-8222-222222222222';

function setup() {
  const queries: Record<string, QueryStub> = {};
  const upload = vi.fn();
  const list = vi.fn();
  const rpc = vi.fn();
  const storageFrom = vi.fn(() => ({ upload, list }));
  const client = {
    from: vi.fn((table: string) => queries[table].builder),
    rpc,
    storage: { from: storageFrom },
  };
  TestBed.configureTestingModule({ providers: [{ provide: SUPABASE, useValue: client }] });
  const service = TestBed.inject(StoreService);
  return { service, client, queries, upload, list, rpc, storageFrom };
}

describe('StoreService', () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => (ctx = setup()));

  it('getEvent: lee solo columnas públicas y normaliza el QR de la tienda', async () => {
    ctx.queries['events'] = queryStub({
      data: { id: EVENT, slug: 'devfest', title: 'DevFest', store_payment_qr_url: '  ' },
      error: null,
    });
    const event = await ctx.service.getEvent('devfest');
    expect(event).toEqual({ id: EVENT, slug: 'devfest', title: 'DevFest', paymentQrUrl: null });
    expect(callsTo(ctx.queries['events'], 'eq')).toEqual([['slug', 'devfest']]);
  });

  it('listProducts: solo activos del evento, precio en centavos y galería ordenada', async () => {
    ctx.queries['store_products'] = queryStub({
      data: [
        {
          id: 'p1',
          name: 'Polera',
          description: '  ',
          price: '120.50',
          position: 1,
          store_product_images: [
            { id: 'i2', url: 'https://x/2.webp', position: 2, alt_text: null },
            { id: 'i1', url: 'https://x/1.webp', position: 1, alt_text: 'Frente' },
          ],
        },
      ],
      error: null,
    });
    const [p] = await ctx.service.listProducts(EVENT);
    expect(p.priceCents).toBe(12050);
    expect(p.description).toBeNull();
    expect(p.images.map((i) => i.id)).toEqual(['i1', 'i2']);
    expect(p.images[1].alt).toBe('Polera');
    expect(callsTo(ctx.queries['store_products'], 'eq')).toEqual([
      ['event_id', EVENT],
      ['is_active', true],
    ]);
  });

  it('listMyOrders: compras propias del evento con precios registrados', async () => {
    ctx.queries['store_orders'] = queryStub({
      data: [
        {
          id: 'o1',
          event_id: EVENT,
          registration_id: 'r1',
          status: 'PAID',
          total: '241.00',
          created_at: '2026-11-20T15:00:00Z',
          store_order_items: [
            { id: 'it1', product_name: 'Taza', unit_price: '1.00', quantity: 1, subtotal: null },
            {
              id: 'it2',
              product_name: 'Polera',
              unit_price: '120.00',
              quantity: 2,
              subtotal: '240.00',
            },
          ],
        },
      ],
      error: null,
    });
    const [order] = await ctx.service.listMyOrders(USER, EVENT);
    expect(order.totalCents).toBe(24100);
    expect(order.items.map((i) => [i.productName, i.subtotalCents])).toEqual([
      ['Polera', 24000],
      ['Taza', 100],
    ]);
    expect(callsTo(ctx.queries['store_orders'], 'eq')).toEqual([
      ['user_id', USER],
      ['event_id', EVENT],
    ]);
  });

  it('uploadProof: bucket PRIVADO de la tienda, sin upsert, a la ruta indicada', async () => {
    ctx.upload.mockResolvedValue({ data: { path: 'x' }, error: null });
    const file = new File(['img'], 'pago.jpg', { type: 'image/jpeg' });
    const path = `${USER}/${EVENT}/abc.jpg`;
    await expect(ctx.service.uploadProof(file, path)).resolves.toBe(path);
    expect(ctx.storageFrom).toHaveBeenCalledWith(STORE_PROOFS_BUCKET);
    expect(ctx.storageFrom).not.toHaveBeenCalledWith('payment-proofs');
    expect(ctx.upload).toHaveBeenCalledWith(path, file, expect.objectContaining({ upsert: false }));
  });

  it('uploadProof: si el archivo ya existe en esa ruta, reutiliza la subida anterior', async () => {
    ctx.upload.mockResolvedValue({
      data: null,
      error: { message: 'The resource already exists', statusCode: '409' },
    });
    const file = new File(['img'], 'pago.jpg', { type: 'image/jpeg' });
    await expect(ctx.service.uploadProof(file, 'a/b/c.jpg')).resolves.toBe('a/b/c.jpg');
  });

  it('uploadProof: el rechazo por RLS (p. ej. 10 comprobantes) se traduce', async () => {
    ctx.upload.mockResolvedValue({
      data: null,
      error: { message: 'new row violates row-level security policy', status: 403 },
    });
    const file = new File(['img'], 'pago.jpg', { type: 'image/jpeg' });
    await expect(ctx.service.uploadProof(file, 'a/b/c.jpg')).rejects.toMatchObject({
      kind: 'proof-rejected',
    });
  });

  it('createOrder: solo vía create_store_order con id y cantidad', async () => {
    ctx.rpc.mockResolvedValue({ data: 'order-1', error: null, status: 200 });
    const id = await ctx.service.createOrder(
      EVENT,
      [{ product_id: 'p1', quantity: 2 }],
      'a/b/c.jpg',
    );
    expect(id).toBe('order-1');
    expect(ctx.rpc).toHaveBeenCalledWith('create_store_order', {
      p_event_id: EVENT,
      p_items: [{ product_id: 'p1', quantity: 2 }],
      p_payment_proof_path: 'a/b/c.jpg',
    });
  });

  it('createOrder: los códigos del servidor llegan como StoreError', async () => {
    ctx.rpc.mockResolvedValue({ data: null, error: { code: 'P0057', message: 'x' }, status: 400 });
    const err = await ctx.service.createOrder(EVENT, [], 'p').catch((e) => e);
    expect(err).toBeInstanceOf(StoreError);
    expect(err.kind).toBe('pending-limit');
  });

  it('findOrderByProof: busca la compra propia por la ruta del comprobante', async () => {
    ctx.queries['store_orders'] = queryStub({ data: { id: 'order-1' }, error: null });
    await expect(ctx.service.findOrderByProof('a/b/c.jpg')).resolves.toBe('order-1');
    expect(callsTo(ctx.queries['store_orders'], 'eq')).toEqual([
      ['payment_proof_path', 'a/b/c.jpg'],
    ]);
  });

  it('countMyProofs: cuenta los archivos de la carpeta del usuario en el evento', async () => {
    ctx.list.mockResolvedValue({
      data: [{ name: 'a.jpg' }, { name: 'b.png' }, { name: '.emptyFolderPlaceholder' }],
      error: null,
    });
    await expect(ctx.service.countMyProofs(USER, EVENT)).resolves.toBe(2);
    expect(ctx.list).toHaveBeenCalledWith(`${USER}/${EVENT}`, { limit: 100 });
  });
});

describe('buildProofPath', () => {
  it('usa <uid>/<evento>/<uuid>.<ext>, sin nombre de archivo ni datos personales', () => {
    const path = buildProofPath(USER, EVENT, 'image/webp');
    expect(path).toMatch(new RegExp(`^${USER}/${EVENT}/[0-9a-f-]{36}\\.webp$`));
    expect(buildProofPath(USER, EVENT, 'image/png').endsWith('.png')).toBe(true);
    expect(buildProofPath(USER, EVENT, 'image/jpeg').endsWith('.jpg')).toBe(true);
  });
});
