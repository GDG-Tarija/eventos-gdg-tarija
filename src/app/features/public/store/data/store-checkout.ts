import { signal } from '@angular/core';

import { compressImage } from '../../events/registration/data/compress-image';
import { OrderItemInput } from './store-cart';
import { StoreError, toStoreError } from './store-errors';
import { PROOF_MAX_BYTES, PROOF_MIME_TYPES } from './store.model';
import { buildProofPath, StoreService } from './store.service';

export type CheckoutPhase = 'idle' | 'uploading' | 'creating' | 'verifying';

type CheckoutStore = Pick<StoreService, 'uploadProof' | 'createOrder' | 'findOrderByProof'>;

const isAcceptedType = (type: string) => (PROOF_MIME_TYPES as readonly string[]).includes(type);

/** Validación rápida en el cliente; el bucket vuelve a validar tipo y tamaño. */
export function validateProofFile(file: File | null): StoreError | null {
  if (!file || file.size <= 0) {
    return new StoreError('proof', 'Adjunta la captura o foto de tu comprobante de pago.');
  }
  if (!isAcceptedType(file.type)) {
    return new StoreError('proof', 'Usa una imagen JPG, PNG o WebP.');
  }
  return null;
}

const fileKey = (f: File) => `${f.name}:${f.size}:${f.lastModified}:${f.type}`;

/**
 * Un intento de compra: sube el comprobante solo al confirmar, a una ruta fija por archivo, y
 * crea la compra con create_store_order. Ante fallos recuperables reutiliza la ruta ya subida
 * (no gasta otro de los 10 comprobantes) y, si la respuesta del RPC es incierta, busca la compra
 * por su comprobante antes de reintentar: nunca crea dos compras con el mismo pago.
 */
export class StoreCheckout {
  readonly phase = signal<CheckoutPhase>('idle');

  private proofPath: string | null = null;
  private plannedPath: string | null = null;
  private currentFileKey: string | null = null;
  private orderId: string | null = null;
  private inFlight: Promise<string> | null = null;

  constructor(
    private readonly store: CheckoutStore,
    private readonly ctx: { eventId: string; userId: string },
    private readonly compress: (file: File) => Promise<File> = (f) => compressImage(f),
  ) {}

  get createdOrderId(): string | null {
    return this.orderId;
  }

  /** Ya hay un comprobante subido para este intento (no cuenta otra vez contra el límite). */
  get hasUploadedProof(): boolean {
    return this.proofPath !== null;
  }

  /** Idempotente mientras hay un envío en curso: un doble clic recibe la misma promesa. */
  submit(file: File | null, items: OrderItemInput[]): Promise<string> {
    if (!this.inFlight) {
      this.inFlight = this.run(file, items).finally(() => {
        this.inFlight = null;
        this.phase.set('idle');
      });
    }
    return this.inFlight;
  }

  private async run(file: File | null, items: OrderItemInput[]): Promise<string> {
    if (this.orderId) return this.orderId;
    const invalid = validateProofFile(file);
    if (invalid || !file) throw invalid;
    if (items.length === 0) throw new StoreError('cart', 'Agrega al menos un producto.');

    const key = fileKey(file);
    if (this.currentFileKey !== key) {
      // Otro archivo: el anterior (si se subió) queda sin usar; SUPERADMIN puede limpiarlo.
      this.currentFileKey = key;
      this.proofPath = null;
      this.plannedPath = null;
    }

    if (!this.proofPath) {
      this.phase.set('uploading');
      const ready = await this.compress(file);
      if (ready.size > PROOF_MAX_BYTES) {
        throw new StoreError('proof', 'El comprobante supera 5 MB. Usa una imagen más liviana.');
      }
      if (!isAcceptedType(ready.type))
        throw new StoreError('proof', 'Usa una imagen JPG, PNG o WebP.');
      this.plannedPath ??= buildProofPath(this.ctx.userId, this.ctx.eventId, ready.type);
      this.proofPath = await this.store.uploadProof(ready, this.plannedPath);
    }

    this.phase.set('creating');
    try {
      this.orderId = await this.store.createOrder(this.ctx.eventId, items, this.proofPath);
      return this.orderId;
    } catch (e) {
      const err = toStoreError(e);
      if (err.uncertain || err.kind === 'proof-used') {
        this.phase.set('verifying');
        let existing: string | null;
        try {
          existing = await this.store.findOrderByProof(this.proofPath);
        } catch {
          throw err;
        }
        if (existing) {
          this.orderId = existing;
          return existing;
        }
        if (err.kind === 'proof-used') this.resetProof();
      }
      if (err.kind === 'proof-missing') this.resetProof();
      throw err;
    }
  }

  private resetProof(): void {
    this.proofPath = null;
    this.plannedPath = null;
  }
}
