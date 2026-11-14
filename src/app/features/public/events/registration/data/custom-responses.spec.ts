import { toCustomResponses } from './custom-responses';

describe('toCustomResponses', () => {
  it('convierte true en "Sí" y descarta false', () => {
    expect(toCustomResponses({ terms: true, news: false })).toEqual({ terms: 'Sí' });
  });

  it('descarta null, undefined y textos vacíos o en blanco', () => {
    expect(toCustomResponses({ a: null, b: undefined, c: '', d: '   ' })).toEqual({});
  });

  it('recorta los textos', () => {
    expect(toCustomResponses({ uni: '  UCB ' })).toEqual({ uni: 'UCB' });
  });

  it('convierte números a texto', () => {
    expect(toCustomResponses({ age: 25, zero: 0 })).toEqual({ age: '25', zero: '0' });
  });
});
