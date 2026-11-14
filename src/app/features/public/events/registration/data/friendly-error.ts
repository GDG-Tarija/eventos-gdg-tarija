/** Traduce errores técnicos (útiles en consola) a un mensaje que el usuario pueda entender. */
export function friendlyError(e: unknown): string {
  const message = e instanceof Error ? e.message : String(e ?? '');
  if (e instanceof TypeError || /failed to fetch|networkerror|fetch failed/i.test(message)) {
    return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.';
  }
  if (message.includes('23505')) return 'Ya tienes una inscripción para este evento.';
  if (message.startsWith('[storage.upload]')) {
    return 'No pudimos subir tu comprobante. Usa una imagen JPG o PNG e inténtalo de nuevo.';
  }
  return 'No pudimos completar tu registro. Inténtalo de nuevo.';
}
