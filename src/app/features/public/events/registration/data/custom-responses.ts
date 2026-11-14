/** Normaliza las respuestas del formulario a texto: checkbox marcado → 'Sí', vacíos se descartan. */
export function toCustomResponses(responses: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(responses)) {
    if (value === true) out[key] = 'Sí';
    else if (typeof value === 'number') out[key] = String(value);
    else if (typeof value === 'string' && value.trim()) out[key] = value.trim();
  }
  return out;
}
