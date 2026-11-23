import { landReel, loopReel } from './raffle-screen';

const NAMES = ['Ana', 'Beto', 'Carla'];

describe('ruleta del sorteo', () => {
  it('mientras gira repite la misma tanda para que la vuelta no tenga corte', () => {
    const reel = loopReel(NAMES);
    const half = reel.names.length / 2;
    expect(reel.stop).toBe(0);
    expect(reel.names.slice(0, half)).toEqual(reel.names.slice(half));
    expect(reel.names.every((n) => NAMES.includes(n))).toBe(true);
  });

  it('frena en el ganador que eligió el servidor, aunque no esté en la lista', () => {
    const reel = landReel(NAMES, 'Zoe', 30);
    expect(reel.stop).toBe(30);
    expect(reel.names[30]).toBe('Zoe');
    expect(reel.names.length).toBeGreaterThan(31);
  });
});
