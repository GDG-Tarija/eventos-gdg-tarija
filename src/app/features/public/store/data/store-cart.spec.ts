import { afterEach, describe, expect, it } from 'vitest';

import { formatBs, toCents } from './money';
import {
  addOne,
  cartLines,
  cartTotalCents,
  cartUnits,
  loadCart,
  parseCart,
  reconcileCart,
  removeOne,
  removeProduct,
  saveCart,
  setQuantity,
  toOrderItems,
} from './store-cart';
import { StoreProduct } from './store.model';

const product = (id: string, priceCents: number): StoreProduct => ({
  id,
  name: `Producto ${id}`,
  description: null,
  priceCents,
  images: [],
});

describe('dinero', () => {
  it('convierte numeric de Postgres a centavos sin errores de coma flotante', () => {
    expect(toCents(19.99)).toBe(1999);
    expect(toCents('0.10')).toBe(10);
    expect(toCents('120.00')).toBe(12000);
    expect(toCents(null)).toBe(0);
    expect(toCents('abc')).toBe(0);
  });

  it('formatea en bolivianos, con decimales solo si hacen falta', () => {
    expect(formatBs(12000)).toBe('Bs 120');
    expect(formatBs(1250)).toBe('Bs 12,50');
    expect(formatBs(123456)).toBe('Bs 1.234,56');
    expect(formatBs(0)).toBe('Bs 0');
  });
});

describe('carrito', () => {
  it('limita cada producto a 1..5 unidades y 0 lo quita', () => {
    let cart = addOne({}, 'a');
    expect(cart).toEqual({ a: 1 });
    for (let i = 0; i < 10; i++) cart = addOne(cart, 'a');
    expect(cart['a']).toBe(5);
    expect(setQuantity(cart, 'a', 9)['a']).toBe(5);
    expect(setQuantity(cart, 'a', 2.7)['a']).toBe(2);
    expect(setQuantity(cart, 'a', 0)).toEqual({});
    expect(setQuantity(cart, 'a', -3)).toEqual({});
    expect(setQuantity(cart, 'a', Number.NaN)).toEqual({});
  });

  it('restar en 1 quita el producto; quitar lo elimina aunque tenga varias unidades', () => {
    expect(removeOne({ a: 1 }, 'a')).toEqual({});
    expect(removeOne({ a: 3 }, 'a')).toEqual({ a: 2 });
    expect(removeProduct({ a: 4, b: 1 }, 'a')).toEqual({ b: 1 });
  });

  it('no muta el carrito original', () => {
    const cart = { a: 1 };
    addOne(cart, 'a');
    expect(cart).toEqual({ a: 1 });
  });

  it('calcula subtotales y total en centavos (sin 0,1 + 0,2)', () => {
    const products = [product('a', 1999), product('b', 10), product('c', 20)];
    const lines = cartLines({ a: 3, b: 1, c: 1 }, products);
    expect(lines.map((l) => l.subtotalCents)).toEqual([5997, 10, 20]);
    expect(cartTotalCents(lines)).toBe(6027);
    expect(formatBs(cartTotalCents(lines))).toBe('Bs 60,27');
    expect(cartUnits(lines)).toBe(5);
  });

  it('respeta el orden del catálogo e ignora productos que ya no están', () => {
    const products = [product('b', 100), product('a', 100)];
    expect(cartLines({ a: 1, b: 2, x: 1 }, products).map((l) => l.product.id)).toEqual(['b', 'a']);
  });

  it('reconcilia el carrito con el catálogo y cuenta lo que quitó', () => {
    expect(reconcileCart({ a: 1, x: 2 }, [product('a', 100)])).toEqual({
      cart: { a: 1 },
      removed: 1,
    });
    expect(reconcileCart({ a: 1 }, [product('a', 100)]).removed).toBe(0);
  });

  it('arma el payload del RPC solo con id y cantidad (el precio lo fija el servidor)', () => {
    const lines = cartLines({ a: 2 }, [product('a', 100)]);
    expect(toOrderItems(lines)).toEqual([{ product_id: 'a', quantity: 2 }]);
  });

  it('descarta datos inválidos al leer el carrito guardado', () => {
    expect(parseCart({ a: 2, b: 9, c: 0, d: 'x', e: 1.5 })).toEqual({ a: 2, b: 5 });
    expect(parseCart(null)).toEqual({});
    expect(parseCart([1, 2])).toEqual({});
  });
});

describe('persistencia del carrito', () => {
  afterEach(() => sessionStorage.clear());

  it('guarda y recupera por evento, y borra la clave cuando queda vacío', () => {
    saveCart('ev1', { a: 2 });
    expect(loadCart('ev1')).toEqual({ a: 2 });
    expect(loadCart('ev2')).toEqual({});
    saveCart('ev1', {});
    expect(sessionStorage.getItem('gdg-store-cart:ev1')).toBeNull();
  });

  it('tolera JSON corrupto', () => {
    sessionStorage.setItem('gdg-store-cart:ev1', '{no-json');
    expect(loadCart('ev1')).toEqual({});
  });
});
