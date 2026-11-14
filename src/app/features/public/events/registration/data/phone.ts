export function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-.()]/g, '');
}

/** Celular boliviano (con o sin +591) o internacional con código de país. */
export function isValidPhone(raw: string): boolean {
  const p = normalizePhone(raw);
  return /^(\+?591)?[67]\d{7}$/.test(p) || /^\+\d{8,15}$/.test(p);
}
