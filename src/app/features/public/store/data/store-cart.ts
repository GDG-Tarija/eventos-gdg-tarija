import { MAX_UNITS, MIN_UNITS, StoreProduct } from './store.model';

/** Carrito: id de producto → unidades (1..5). Inmutable: cada operación devuelve uno nuevo. */
export type Cart = Readonly<Record<string, number>>;

export interface CartLine {
  product: StoreProduct;
  quantity: number;
  subtotalCents: number;
}

export interface OrderItemInput {
  product_id: string;
  quantity: number;
}

/** Fija las unidades de un producto; 0 o menos lo quita y más de 5 se recorta a 5. */
export function setQuantity(cart: Cart, productId: string, quantity: number): Cart {
  const units = Math.min(MAX_UNITS, Math.trunc(Number.isFinite(quantity) ? quantity : 0));
  const next = { ...cart };
  if (units < MIN_UNITS) delete next[productId];
  else next[productId] = units;
  return next;
}

export function addOne(cart: Cart, productId: string): Cart {
  return setQuantity(cart, productId, (cart[productId] ?? 0) + 1);
}

export function removeOne(cart: Cart, productId: string): Cart {
  return setQuantity(cart, productId, (cart[productId] ?? 0) - 1);
}

export function removeProduct(cart: Cart, productId: string): Cart {
  return setQuantity(cart, productId, 0);
}

/** Líneas en el orden del catálogo; ignora productos que ya no están disponibles. */
export function cartLines(cart: Cart, products: readonly StoreProduct[]): CartLine[] {
  return products
    .filter((p) => (cart[p.id] ?? 0) > 0)
    .map((product) => {
      const quantity = cart[product.id];
      return { product, quantity, subtotalCents: product.priceCents * quantity };
    });
}

export function cartTotalCents(lines: readonly CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.subtotalCents, 0);
}

export function cartUnits(lines: readonly CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/** Quita del carrito los productos que ya no están en el catálogo. */
export function reconcileCart(
  cart: Cart,
  products: readonly StoreProduct[],
): { cart: Cart; removed: number } {
  const available = new Set(products.map((p) => p.id));
  const next: Record<string, number> = {};
  let removed = 0;
  for (const [id, quantity] of Object.entries(cart)) {
    if (available.has(id)) next[id] = quantity;
    else removed++;
  }
  return { cart: next, removed };
}

/** Payload de create_store_order: [{ product_id, quantity }]. El precio lo fija el servidor. */
export function toOrderItems(lines: readonly CartLine[]): OrderItemInput[] {
  return lines.map((line) => ({ product_id: line.product.id, quantity: line.quantity }));
}

/** Valida un carrito leído de sessionStorage (dato no confiable). */
export function parseCart(raw: unknown): Cart {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  let cart: Cart = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'number' && Number.isInteger(value) && value >= MIN_UNITS) {
      cart = setQuantity(cart, id, value);
    }
  }
  return cart;
}

const storageKey = (eventId: string) => `gdg-store-cart:${eventId}`;

/** El carrito sobrevive a recargas y al ida y vuelta del login con Google (misma pestaña). */
export function loadCart(eventId: string): Cart {
  try {
    const raw = sessionStorage.getItem(storageKey(eventId));
    return raw ? parseCart(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

export function saveCart(eventId: string, cart: Cart): void {
  try {
    if (Object.keys(cart).length === 0) sessionStorage.removeItem(storageKey(eventId));
    else sessionStorage.setItem(storageKey(eventId), JSON.stringify(cart));
  } catch {
    // Sin storage (modo privado estricto) el carrito vive solo en memoria.
  }
}
