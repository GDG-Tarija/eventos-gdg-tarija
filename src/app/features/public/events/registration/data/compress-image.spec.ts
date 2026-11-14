import { describe, expect, it } from 'vitest';

import { compressImage, fitWithin } from './compress-image';

describe('fitWithin', () => {
  it('reduce el lado mayor a maxDim conservando proporción', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });
  it('no agranda imágenes pequeñas', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});

describe('compressImage', () => {
  const opts = { maxBytes: 10, maxDim: 100, quality: 0.8 };

  it('devuelve el original si pesa menos que maxBytes', async () => {
    const f = new File(['abc'], 'a.png', { type: 'image/png' });
    expect(await compressImage(f, opts)).toBe(f);
  });
  it('devuelve el original si no es imagen', async () => {
    const f = new File(['x'.repeat(50)], 'a.pdf', { type: 'application/pdf' });
    expect(await compressImage(f, opts)).toBe(f);
  });
  it('devuelve el original si no se puede decodificar', async () => {
    const f = new File(['x'.repeat(50)], 'a.heic', { type: 'image/heic' });
    expect(await compressImage(f, opts)).toBe(f);
  });
});
