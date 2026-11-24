/** Estados de una compra de la Tienda (los fija la base de datos). */
export type StoreOrderStatus = 'PENDING' | 'PAID' | 'CANCELLED';

/** Unidades por producto en una misma compra (CHECK y RPC del servidor: 1..5). */
export const MIN_UNITS = 1;
export const MAX_UNITS = 5;

/** Tope del servidor: compras PENDING por inscripción (P0057). */
export const MAX_PENDING_ORDERS = 3;

/** Tope del servidor: comprobantes por persona y evento (política de storage). */
export const MAX_PROOFS_PER_EVENT = 10;

/** Límite del bucket privado store-payment-proofs. */
export const PROOF_MAX_BYTES = 5 * 1024 * 1024;

/** Formatos de comprobante aceptados por la Tienda (el bucket admite también PDF; aquí no). */
export const PROOF_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export interface StoreImage {
  id: string;
  url: string;
  alt: string;
}

export interface StoreProduct {
  id: string;
  name: string;
  description: string | null;
  /** Precio en centavos (enteros) para no arrastrar errores de coma flotante. */
  priceCents: number;
  /** Galería ordenada; la primera es la portada. */
  images: StoreImage[];
}

export interface StoreEvent {
  id: string;
  slug: string;
  title: string;
  /** QR de pago de la Tienda; sin QR el servidor no acepta compras. */
  paymentQrUrl: string | null;
}

export interface StoreOrderItem {
  id: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  subtotalCents: number;
}

export interface StoreOrder {
  id: string;
  eventId: string;
  registrationId: string;
  status: StoreOrderStatus;
  totalCents: number;
  createdAt: Date;
  items: StoreOrderItem[];
}

export interface StoreOrderStatusInfo {
  label: string;
  icon: string;
  description: string;
}

/** Textos para el comprador. No hay motivo de anulación visible: el historial es solo de SUPERADMIN. */
export const STORE_ORDER_STATUS: Record<StoreOrderStatus, StoreOrderStatusInfo> = {
  PENDING: {
    label: 'En verificación',
    icon: 'schedule',
    description: 'Estamos verificando tu pago.',
  },
  PAID: {
    label: 'Pagada',
    icon: 'check_circle',
    description: 'Confirmamos tu pago.',
  },
  CANCELLED: {
    label: 'Anulada',
    icon: 'cancel',
    description: 'Esta compra fue anulada. Si tienes dudas, escríbenos.',
  },
};

export function isStoreOrderStatus(value: unknown): value is StoreOrderStatus {
  return value === 'PENDING' || value === 'PAID' || value === 'CANCELLED';
}
