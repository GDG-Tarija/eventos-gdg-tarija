import { describe, expect, it } from 'vitest';

import { isValidPhone, normalizePhone } from './phone';

describe('normalizePhone', () => {
  it('quita separadores y conserva el +', () => {
    expect(normalizePhone('+591 (712) 34-567.8')).toBe('+591712345678');
  });
});

describe('isValidPhone', () => {
  it.each(['71234567', '7123 4567', '+591 71234567', '59161234567', '+54 9 11 2345 6789'])(
    'acepta %s',
    (v) => expect(isValidPhone(v)).toBe(true),
  );
  it.each(['+----', '12345', '51234567', '7123456', 'abcdefgh', '', '+12345'])('rechaza %s', (v) =>
    expect(isValidPhone(v)).toBe(false),
  );
});
