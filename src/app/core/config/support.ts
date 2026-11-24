/** WhatsApp de soporte de GDG Tarija (el mismo que ya usaba Mis tickets). */
export const SUPPORT_WHATSAPP = '59179288990';

export function whatsappSupportUrl(message: string): string {
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`;
}
