import { describe, expect, it } from 'vitest';

import { isDuplicateUpload, StoreError, toProofUploadError, toStoreError } from './store-errors';

describe('toStoreError', () => {
  it.each([
    ['P0040', 'event-unavailable', 'no está disponible'],
    ['P0041', 'store-disabled', 'no está habilitada'],
    ['P0042', 'not-registered', 'inscripción activa'],
    ['P0043', 'cart', 'de 1 a 5 unidades'],
    ['P0044', 'product-unavailable', 'ya no está disponible'],
    ['P0057', 'pending-limit', '3 compras en verificación'],
    ['42501', 'auth', 'Inicia sesión'],
  ])('%s → %s', (code, kind, text) => {
    const err = toStoreError({ code, message: 'mensaje del servidor' });
    expect(err.kind).toBe(kind);
    expect(err.message).toContain(text);
    expect(err.uncertain).toBe(false);
  });

  it('distingue los tres casos de P0045 por el mensaje del servidor', () => {
    expect(
      toStoreError({ code: 'P0045', message: 'Ese comprobante ya se usó en otra compra.' }).kind,
    ).toBe('proof-used');
    expect(
      toStoreError({
        code: 'P0045',
        message: 'No encontramos el comprobante subido. Vuelve a subirlo.',
      }).kind,
    ).toBe('proof-missing');
    expect(
      toStoreError({ code: 'P0045', message: 'Sube el comprobante de pago de esta compra.' }).kind,
    ).toBe('proof');
  });

  it('un corte de red o un 5xx es incierto: la compra pudo crearse', () => {
    const network = toStoreError({ message: 'TypeError: Failed to fetch', code: '' });
    expect(network.kind).toBe('network');
    expect(network.uncertain).toBe(true);
    expect(toStoreError(new TypeError('Load failed')).uncertain).toBe(true);
    expect(toStoreError({ message: 'x', status: 0 }).uncertain).toBe(true);
    expect(toStoreError({ message: 'Bad gateway', status: 502 }).uncertain).toBe(true);
  });

  it('PostgREST responde 500 con los SQLSTATE propios: el código manda, no es incierto', () => {
    const err = toStoreError({ code: 'P0057', message: 'Ya tienes 3 compras', status: 500 });
    expect(err.kind).toBe('pending-limit');
    expect(err.uncertain).toBe(false);
  });

  it('un código desconocido da un mensaje genérico y no incierto', () => {
    const err = toStoreError({ code: 'P0049', message: 'x', status: 400 });
    expect(err.kind).toBe('unknown');
    expect(err.uncertain).toBe(false);
  });

  it('deja pasar un StoreError tal cual', () => {
    const original = new StoreError('cart', 'x');
    expect(toStoreError(original)).toBe(original);
  });
});

describe('errores de subida del comprobante', () => {
  it('RLS (límite de 10 o inscripción inactiva) → mensaje claro', () => {
    const err = toProofUploadError({
      message: 'new row violates row-level security policy',
      status: 400,
    });
    expect(err.kind).toBe('proof-rejected');
    expect(err.message).toContain('10 comprobantes');
  });

  it('tamaño y tipo de archivo', () => {
    expect(
      toProofUploadError({ message: 'The object exceeded the maximum allowed size', status: 413 })
        .message,
    ).toContain('5 MB');
    expect(
      toProofUploadError({ message: 'mime type image/gif is not supported', status: 415 }).message,
    ).toContain('JPG, PNG o WebP');
  });

  it('corte de red al subir es incierto', () => {
    expect(toProofUploadError(new TypeError('Failed to fetch')).uncertain).toBe(true);
  });

  it('reconoce un archivo duplicado (la subida anterior sí llegó)', () => {
    expect(isDuplicateUpload({ message: 'The resource already exists', statusCode: '409' })).toBe(
      true,
    );
    expect(isDuplicateUpload({ message: 'Duplicate', status: 400 })).toBe(true);
    expect(
      isDuplicateUpload({ message: 'new row violates row-level security policy', status: 403 }),
    ).toBe(false);
  });
});
