export type StoreErrorKind =
  | 'network'
  | 'auth'
  | 'event-unavailable'
  | 'store-disabled'
  | 'not-registered'
  | 'cart'
  | 'product-unavailable'
  | 'proof'
  | 'proof-missing'
  | 'proof-used'
  | 'proof-rejected'
  | 'pending-limit'
  | 'unknown';

/** Error de la Tienda con un mensaje listo para el usuario y la causa técnica para la consola. */
export class StoreError extends Error {
  constructor(
    readonly kind: StoreErrorKind,
    message: string,
    /** No sabemos si el servidor alcanzó a procesar la operación (corte de red, 5xx). */
    readonly uncertain = false,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'StoreError';
  }
}

const NETWORK_MESSAGE = 'Sin conexión. Revisa tu internet e inténtalo de nuevo.';

/** Códigos SQLSTATE propios de la Tienda (migración store_products_orders, P0040–P0057). */
const BY_CODE: Record<string, [StoreErrorKind, string]> = {
  '42501': ['auth', 'Inicia sesión para comprar en la Tienda.'],
  P0040: ['event-unavailable', 'Este evento no está disponible para compras.'],
  P0041: ['store-disabled', 'La Tienda de este evento no está habilitada.'],
  P0042: ['not-registered', 'Necesitas una inscripción activa en el evento para comprar.'],
  P0043: ['cart', 'Revisa tu carrito: cada producto admite de 1 a 5 unidades.'],
  P0044: [
    'product-unavailable',
    'Uno de los productos ya no está disponible. Actualizamos el catálogo: revisa tu carrito.',
  ],
  P0057: [
    'pending-limit',
    'Ya tienes 3 compras en verificación en este evento. Espera a que las validemos para hacer otra.',
  ],
};

interface ErrorLike {
  message?: unknown;
  code?: unknown;
  status?: unknown;
  statusCode?: unknown;
}

function asErrorLike(e: unknown): ErrorLike {
  return e && typeof e === 'object' ? (e as ErrorLike) : { message: String(e ?? '') };
}

function isNetworkFailure(e: unknown, message: string, status: number | null): boolean {
  return (
    e instanceof TypeError ||
    status === 0 ||
    /failed to fetch|networkerror|fetch failed|load failed|network request failed/i.test(message)
  );
}

/** Traduce errores de PostgREST/RPC a StoreError. */
export function toStoreError(e: unknown): StoreError {
  if (e instanceof StoreError) return e;
  const err = asErrorLike(e);
  const message = typeof err.message === 'string' ? err.message : '';
  const code = typeof err.code === 'string' ? err.code : '';
  const status = typeof err.status === 'number' ? err.status : null;

  if (isNetworkFailure(e, message, status)) {
    return new StoreError('network', NETWORK_MESSAGE, true, code || undefined);
  }
  if (code === 'P0045') {
    if (/ya se us/i.test(message)) {
      return new StoreError('proof-used', 'Ese comprobante ya se usó en otra compra.', false, code);
    }
    if (/no encontramos/i.test(message)) {
      return new StoreError(
        'proof-missing',
        'No encontramos tu comprobante. Vuelve a intentarlo para subirlo de nuevo.',
        false,
        code,
      );
    }
    return new StoreError('proof', 'Sube el comprobante de pago de esta compra.', false, code);
  }
  const known = BY_CODE[code];
  if (known) return new StoreError(known[0], known[1], false, code);
  if (status !== null && status >= 500) {
    return new StoreError(
      'network',
      'El servidor no respondió. Inténtalo de nuevo en unos segundos.',
      true,
      code || undefined,
    );
  }
  return new StoreError(
    'unknown',
    'No pudimos completar tu compra. Inténtalo de nuevo.',
    false,
    code || undefined,
  );
}

/** El archivo ya existe en esa ruta: con upsert=false la subida anterior sí llegó. */
export function isDuplicateUpload(e: unknown): boolean {
  const err = asErrorLike(e);
  const statusCode = String(err.statusCode ?? '');
  const message = typeof err.message === 'string' ? err.message : '';
  return err.status === 409 || statusCode === '409' || /already exists|duplicate/i.test(message);
}

/** Traduce errores de la subida a storage (bucket privado store-payment-proofs). */
export function toProofUploadError(e: unknown): StoreError {
  if (e instanceof StoreError) return e;
  const err = asErrorLike(e);
  const message = typeof err.message === 'string' ? err.message : '';
  const status = typeof err.status === 'number' ? err.status : Number(err.statusCode) || null;

  if (isNetworkFailure(e, message, status)) {
    return new StoreError('network', NETWORK_MESSAGE, true);
  }
  if (status === 413 || /maximum allowed size|too large/i.test(message)) {
    return new StoreError('proof', 'El comprobante supera 5 MB. Usa una imagen más liviana.');
  }
  if (status === 415 || /mime type/i.test(message)) {
    return new StoreError('proof', 'Usa una imagen JPG, PNG o WebP.');
  }
  if (status === 403 || status === 400 || /row-level security|unauthorized/i.test(message)) {
    // La política solo acepta inscritos activos de eventos publicados con QR y hasta 10 archivos.
    return new StoreError(
      'proof-rejected',
      'No pudimos guardar tu comprobante. Revisa que tu inscripción siga activa; si ya subiste 10 comprobantes en este evento, escríbenos para ayudarte.',
    );
  }
  if (status !== null && status >= 500) {
    return new StoreError('network', 'El servidor no respondió. Inténtalo de nuevo.', true);
  }
  return new StoreError('proof', 'No pudimos subir tu comprobante. Inténtalo de nuevo.');
}
