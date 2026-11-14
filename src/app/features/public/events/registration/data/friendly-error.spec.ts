import { friendlyError } from './friendly-error';

describe('friendlyError', () => {
  it('detecta errores de red', () => {
    const offline = 'Sin conexión. Revisa tu internet e inténtalo de nuevo.';
    expect(friendlyError(new TypeError('x'))).toBe(offline);
    expect(friendlyError(new Error('Failed to fetch'))).toBe(offline);
    expect(friendlyError(new Error('NetworkError when attempting'))).toBe(offline);
    expect(friendlyError(new Error('fetch failed'))).toBe(offline);
  });

  it('traduce la violación de unicidad 23505', () => {
    expect(friendlyError(new Error('[registrations.insert] 23505 duplicate key'))).toBe(
      'Ya tienes una inscripción para este evento.',
    );
  });

  it('traduce errores de subida de comprobante', () => {
    expect(friendlyError(new Error('[storage.upload] 400 bad'))).toBe(
      'No pudimos subir tu comprobante. Usa una imagen JPG o PNG e inténtalo de nuevo.',
    );
  });

  it('usa un mensaje genérico para el resto', () => {
    const generic = 'No pudimos completar tu registro. Inténtalo de nuevo.';
    expect(friendlyError(new Error('boom'))).toBe(generic);
    expect(friendlyError(undefined)).toBe(generic);
  });
});
