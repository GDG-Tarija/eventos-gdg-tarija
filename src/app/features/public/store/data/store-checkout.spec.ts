import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StoreCheckout, validateProofFile } from './store-checkout';
import { StoreError } from './store-errors';

const ctx = { eventId: 'event-1', userId: 'user-1' };
const items = [{ product_id: 'p1', quantity: 2 }];
const image = (name = 'pago.jpg', type = 'image/jpeg', size = 1000) =>
  new File([new Uint8Array(size)], name, { type, lastModified: 1 });

function setup() {
  const store = {
    uploadProof: vi.fn(async (_file: File, path: string) => path),
    createOrder: vi.fn<(eventId: string, items: unknown, path: string) => Promise<string>>(
      async () => 'order-1',
    ),
    findOrderByProof: vi.fn(async (): Promise<string | null> => null),
  };
  const compress = vi.fn(async (f: File) => f);
  const checkout = new StoreCheckout(store, ctx, compress);
  return { store, compress, checkout };
}

const networkError = () => new StoreError('network', 'Sin conexión', true);

describe('validateProofFile', () => {
  it('acepta JPG, PNG y WebP; rechaza vacío, PDF y otros', () => {
    expect(validateProofFile(image())).toBeNull();
    expect(validateProofFile(image('a.png', 'image/png'))).toBeNull();
    expect(validateProofFile(image('a.webp', 'image/webp'))).toBeNull();
    expect(validateProofFile(null)?.kind).toBe('proof');
    expect(validateProofFile(image('a.jpg', 'image/jpeg', 0))?.kind).toBe('proof');
    expect(validateProofFile(image('a.pdf', 'application/pdf'))?.message).toContain(
      'JPG, PNG o WebP',
    );
    expect(validateProofFile(image('a.gif', 'image/gif'))).not.toBeNull();
  });
});

describe('StoreCheckout', () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => (s = setup()));

  it('sube el comprobante comprimido a <uid>/<evento>/… y crea la compra', async () => {
    await expect(s.checkout.submit(image(), items)).resolves.toBe('order-1');
    expect(s.compress).toHaveBeenCalledTimes(1);
    const path = s.store.uploadProof.mock.calls[0][1];
    expect(path).toMatch(/^user-1\/event-1\/[0-9a-f-]{36}\.jpg$/);
    expect(s.store.createOrder).toHaveBeenCalledWith('event-1', items, path);
  });

  it('no sube nada si el archivo no es válido', async () => {
    await expect(s.checkout.submit(image('a.pdf', 'application/pdf'), items)).rejects.toMatchObject(
      {
        kind: 'proof',
      },
    );
    expect(s.store.uploadProof).not.toHaveBeenCalled();
  });

  it('rechaza comprobantes de más de 5 MB tras comprimir', async () => {
    s.compress.mockResolvedValue(image('big.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1));
    await expect(s.checkout.submit(image(), items)).rejects.toMatchObject({ kind: 'proof' });
    expect(s.store.uploadProof).not.toHaveBeenCalled();
  });

  it('un doble clic no crea dos compras ni sube dos comprobantes', async () => {
    const file = image();
    const [a, b] = await Promise.all([
      s.checkout.submit(file, items),
      s.checkout.submit(file, items),
    ]);
    expect(a).toBe('order-1');
    expect(b).toBe('order-1');
    expect(s.store.uploadProof).toHaveBeenCalledTimes(1);
    expect(s.store.createOrder).toHaveBeenCalledTimes(1);
  });

  it('tras crear la compra, otro envío devuelve la misma sin llamar al servidor', async () => {
    const file = image();
    await s.checkout.submit(file, items);
    await expect(s.checkout.submit(file, items)).resolves.toBe('order-1');
    expect(s.store.createOrder).toHaveBeenCalledTimes(1);
  });

  it('respuesta incierta del RPC: si la compra existe, la usa y no reintenta', async () => {
    s.store.createOrder.mockRejectedValueOnce(networkError());
    s.store.findOrderByProof.mockResolvedValueOnce('order-ya-creada');
    await expect(s.checkout.submit(image(), items)).resolves.toBe('order-ya-creada');
    expect(s.store.createOrder).toHaveBeenCalledTimes(1);
    expect(s.store.findOrderByProof).toHaveBeenCalledWith(s.store.uploadProof.mock.calls[0][1]);
  });

  it('respuesta incierta sin compra: falla, y el reintento reutiliza el comprobante ya subido', async () => {
    const file = image();
    s.store.createOrder.mockRejectedValueOnce(networkError());
    await expect(s.checkout.submit(file, items)).rejects.toMatchObject({ kind: 'network' });
    expect(s.checkout.hasUploadedProof).toBe(true);
    await expect(s.checkout.submit(file, items)).resolves.toBe('order-1');
    expect(s.store.uploadProof).toHaveBeenCalledTimes(1);
    const [first, second] = s.store.createOrder.mock.calls;
    expect(second[2]).toBe(first[2]);
  });

  it('si tampoco se puede verificar la compra, conserva el comprobante y no reintenta solo', async () => {
    s.store.createOrder.mockRejectedValueOnce(networkError());
    s.store.findOrderByProof.mockRejectedValueOnce(networkError());
    await expect(s.checkout.submit(image(), items)).rejects.toMatchObject({ kind: 'network' });
    expect(s.store.createOrder).toHaveBeenCalledTimes(1);
    expect(s.checkout.hasUploadedProof).toBe(true);
  });

  it('corte de red al subir: el reintento usa la misma ruta (sin gastar otro comprobante)', async () => {
    const file = image();
    s.store.uploadProof.mockRejectedValueOnce(networkError());
    await expect(s.checkout.submit(file, items)).rejects.toMatchObject({ kind: 'network' });
    await s.checkout.submit(file, items);
    const [first, second] = s.store.uploadProof.mock.calls;
    expect(second[1]).toBe(first[1]);
  });

  it('fallo recuperable (producto no disponible): reintenta con el mismo comprobante', async () => {
    const file = image();
    s.store.createOrder.mockRejectedValueOnce({ code: 'P0044', message: 'x' });
    await expect(s.checkout.submit(file, items)).rejects.toMatchObject({
      kind: 'product-unavailable',
    });
    expect(s.store.findOrderByProof).not.toHaveBeenCalled();
    await s.checkout.submit(file, [{ product_id: 'p2', quantity: 1 }]);
    expect(s.store.uploadProof).toHaveBeenCalledTimes(1);
  });

  it('límite de 3 compras pendientes: error claro y sin compra', async () => {
    s.store.createOrder.mockRejectedValueOnce({ code: 'P0057', message: 'x' });
    await expect(s.checkout.submit(image(), items)).rejects.toMatchObject({
      kind: 'pending-limit',
    });
    expect(s.checkout.createdOrderId).toBeNull();
  });

  it('comprobante perdido en storage: el reintento lo vuelve a subir', async () => {
    const file = image();
    s.store.createOrder.mockRejectedValueOnce({
      code: 'P0045',
      message: 'No encontramos el comprobante subido.',
    });
    await expect(s.checkout.submit(file, items)).rejects.toMatchObject({ kind: 'proof-missing' });
    await s.checkout.submit(file, items);
    expect(s.store.uploadProof).toHaveBeenCalledTimes(2);
  });

  it('comprobante "ya usado" por una compra propia: la recupera en vez de duplicarla', async () => {
    s.store.createOrder.mockRejectedValueOnce({
      code: 'P0045',
      message: 'Ese comprobante ya se usó en otra compra.',
    });
    s.store.findOrderByProof.mockResolvedValueOnce('order-previa');
    await expect(s.checkout.submit(image(), items)).resolves.toBe('order-previa');
  });

  it('si la persona cambia de archivo, sube el nuevo', async () => {
    s.store.createOrder.mockRejectedValueOnce({ code: 'P0044', message: 'x' });
    await s.checkout.submit(image('a.jpg'), items).catch(() => undefined);
    await s.checkout.submit(image('b.png', 'image/png'), items);
    expect(s.store.uploadProof).toHaveBeenCalledTimes(2);
    expect(s.store.uploadProof.mock.calls[1][1]).toMatch(/\.png$/);
  });

  it('rechaza un carrito vacío sin subir el comprobante', async () => {
    await expect(s.checkout.submit(image(), [])).rejects.toMatchObject({ kind: 'cart' });
    expect(s.store.uploadProof).not.toHaveBeenCalled();
  });

  it('expone la fase y vuelve a idle al terminar', async () => {
    let resolve!: (id: string) => void;
    s.store.createOrder.mockReturnValueOnce(new Promise<string>((r) => (resolve = r)));
    const pending = s.checkout.submit(image(), items);
    await vi.waitFor(() => expect(s.checkout.phase()).toBe('creating'));
    resolve('order-1');
    await pending;
    expect(s.checkout.phase()).toBe('idle');
  });
});
