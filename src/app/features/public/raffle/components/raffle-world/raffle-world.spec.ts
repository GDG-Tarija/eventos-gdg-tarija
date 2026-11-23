import { hashId, pickWalkers } from './raffle-world';

const entry = (id: string, tickets = 1) => ({
  registrationId: id,
  name: id,
  tickets,
  avatarUrl: null,
});

describe('hashId', () => {
  it('es estable y distingue ids', () => {
    expect(hashId('ana')).toBe(hashId('ana'));
    expect(hashId('ana')).not.toBe(hashId('beto'));
    expect(hashId('ana')).toBeGreaterThanOrEqual(0);
  });
});

describe('pickWalkers', () => {
  const pool = Array.from({ length: 50 }, (_, i) => entry(`r${i}`, 50 - i));

  it('si caben, caminan todos', () => {
    expect(pickWalkers(pool, 50)).toBe(pool);
  });

  it('si no caben, la muestra es estable y no depende del orden por tickets', () => {
    const sample = pickWalkers(pool, 10);
    expect(sample).toHaveLength(10);
    expect(pickWalkers([...pool].reverse(), 10)).toEqual(sample);
    expect(sample.map((p) => p.registrationId)).not.toEqual(
      pool.slice(0, 10).map((p) => p.registrationId),
    );
  });
});
