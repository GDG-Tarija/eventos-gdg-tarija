import { Injectable, inject } from '@angular/core';

import { SUPABASE } from '../../../../core/supabase/supabase.client';
import { toCents } from './money';
import { OrderItemInput } from './store-cart';
import { isDuplicateUpload, toProofUploadError, toStoreError } from './store-errors';
import { isStoreOrderStatus, StoreEvent, StoreOrder, StoreProduct } from './store.model';

/** Bucket PRIVADO de comprobantes de la Tienda. Nunca payment-proofs (público, de inscripciones). */
export const STORE_PROOFS_BUCKET = 'store-payment-proofs';

interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  position: number;
  store_product_images:
    | { id: string; url: string; position: number; alt_text: string | null }[]
    | null;
}

interface OrderRow {
  id: string;
  event_id: string;
  registration_id: string;
  status: string;
  total: number | string;
  created_at: string;
  store_order_items:
    | {
        id: string;
        product_name: string;
        unit_price: number | string;
        quantity: number;
        subtotal: number | string | null;
      }[]
    | null;
}

const ORDER_COLUMNS =
  'id, event_id, registration_id, status, total, created_at, store_order_items (id, product_name, unit_price, quantity, subtotal)';

export function mapProduct(row: ProductRow): StoreProduct {
  return {
    id: row.id,
    name: row.name,
    description: row.description?.trim() || null,
    priceCents: toCents(row.price),
    images: [...(row.store_product_images ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((img) => ({ id: img.id, url: img.url, alt: img.alt_text?.trim() || row.name })),
  };
}

export function mapOrder(row: OrderRow): StoreOrder {
  return {
    id: row.id,
    eventId: row.event_id,
    registrationId: row.registration_id,
    status: isStoreOrderStatus(row.status) ? row.status : 'PENDING',
    totalCents: toCents(row.total),
    createdAt: new Date(row.created_at),
    items: [...(row.store_order_items ?? [])]
      .map((item) => {
        const unitPriceCents = toCents(item.unit_price);
        return {
          id: item.id,
          productName: item.product_name,
          unitPriceCents,
          quantity: item.quantity,
          subtotalCents:
            item.subtotal === null ? unitPriceCents * item.quantity : toCents(item.subtotal),
        };
      })
      .sort((a, b) => a.productName.localeCompare(b.productName, 'es')),
  };
}

/** Ruta del comprobante: <uid>/<evento>/<uuid>.<ext>, sin datos personales en el nombre. */
export function buildProofPath(userId: string, eventId: string, mimeType: string): string {
  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  return `${userId}/${eventId}/${crypto.randomUUID()}.${ext}`;
}

/**
 * Acceso a la Tienda pública. La seguridad real está en la base: RLS (productos activos de
 * eventos publicados, compras propias) y create_store_order (precio, total y estado los fija el
 * servidor).
 */
@Injectable({ providedIn: 'root' })
export class StoreService {
  private readonly supabase = inject(SUPABASE);

  async getEvent(slug: string): Promise<StoreEvent | null> {
    const { data, error } = await this.supabase
      .from('events')
      .select('id, slug, title, store_payment_qr_url')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw toStoreError(error);
    if (!data) return null;
    return {
      id: data.id,
      slug: data.slug,
      title: data.title,
      paymentQrUrl: data.store_payment_qr_url?.trim() || null,
    };
  }

  /** Productos activos ordenados. El filtro is_active cubre a SUPERADMIN, que por RLS ve todos. */
  async listProducts(eventId: string): Promise<StoreProduct[]> {
    const { data, error } = await this.supabase
      .from('store_products')
      .select(
        'id, name, description, price, position, store_product_images (id, url, position, alt_text)',
      )
      .eq('event_id', eventId)
      .eq('is_active', true)
      .order('position', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw toStoreError(error);
    return ((data ?? []) as ProductRow[]).map(mapProduct);
  }

  async countProducts(eventId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('store_products')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('is_active', true);
    if (error) throw toStoreError(error);
    return count ?? 0;
  }

  /** Compras del usuario (RLS ya limita a las propias), más recientes primero. */
  async listMyOrders(userId: string, eventId?: string): Promise<StoreOrder[]> {
    let query = this.supabase.from('store_orders').select(ORDER_COLUMNS).eq('user_id', userId);
    if (eventId) query = query.eq('event_id', eventId);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw toStoreError(error);
    return ((data ?? []) as OrderRow[]).map(mapOrder);
  }

  /** Comprobantes ya subidos por el usuario en el evento (el servidor admite hasta 10). */
  async countMyProofs(userId: string, eventId: string): Promise<number> {
    const { data, error } = await this.supabase.storage
      .from(STORE_PROOFS_BUCKET)
      .list(`${userId}/${eventId}`, { limit: 100 });
    if (error) throw toProofUploadError(error);
    return (data ?? []).filter((f) => !f.name.startsWith('.')).length;
  }

  /** Sube a una ruta fija (sin upsert). Si ya existe, una subida anterior llegó: se reutiliza. */
  async uploadProof(file: File, path: string): Promise<string> {
    const { error } = await this.supabase.storage.from(STORE_PROOFS_BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: '3600',
    });
    if (error && !isDuplicateUpload(error)) throw toProofUploadError(error);
    return path;
  }

  async createOrder(eventId: string, items: OrderItemInput[], proofPath: string): Promise<string> {
    const { data, error, status } = await this.supabase.rpc('create_store_order', {
      p_event_id: eventId,
      // Literales nuevos: una interface no es asignable al tipo Json del RPC.
      p_items: items.map(({ product_id, quantity }) => ({ product_id, quantity })),
      p_payment_proof_path: proofPath,
    });
    if (error) throw toStoreError({ ...error, status });
    if (typeof data !== 'string') throw toStoreError({ message: 'Respuesta inesperada', status });
    return data;
  }

  /** Busca la compra propia que usa ese comprobante (para respuestas inciertas del RPC). */
  async findOrderByProof(proofPath: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('store_orders')
      .select('id')
      .eq('payment_proof_path', proofPath)
      .maybeSingle();
    if (error) throw toStoreError(error);
    return data?.id ?? null;
  }
}
