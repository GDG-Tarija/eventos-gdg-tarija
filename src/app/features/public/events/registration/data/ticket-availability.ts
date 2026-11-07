import { TicketPhase, TicketType } from '../../../../../models/ticket.model';

/** Cuando restan hasta este número de lugares se muestra el aviso "¡Quedan N!". */
export const LOW_STOCK_THRESHOLD = 10;

/** Fila del paquete en `ticket_types` (columnas que lee el sitio de registro). */
export interface TicketTypeRow {
  id: string;
  event_id: string;
  name: string;
  price: number | string | null;
  ticket_capacity: number | string | null;
  payment_qr_url?: string | null;
  image_url?: string | null;
}

/** Fila de la RPC `get_ticket_availability`. */
export interface AvailabilityRow {
  ticket_type_id: string;
  ticket_phase_id: string | null;
  name: string;
  position: number;
  price: number | string | null;
  payment_qr_url: string | null;
  capacity: number | null;
  sold: number | null;
  remaining: number | null;
  is_active: boolean;
  package_capacity: number | null;
  package_sold: number | null;
}

export function getActivePhase(phases: readonly TicketPhase[] | undefined): TicketPhase | null {
  return phases?.find((p) => p.is_active) ?? null;
}

/** Fases agotadas que se muestran tachadas junto a la activa. */
export function getSoldOutPhases(ticket: TicketType): TicketPhase[] {
  return ticket.phases?.filter((p) => p.sold_out) ?? [];
}

/** Lugares restantes a mostrar, o null si no aplica el aviso de poco stock. */
export function lowStockRemaining(ticket: TicketType): number | null {
  if (ticket.sold_out) return null;
  const left = ticket.remaining;
  return left != null && left > 0 && left <= LOW_STOCK_THRESHOLD ? left : null;
}

function minRemaining(a: number | null, b: number | null): number | null {
  if (a == null) return b;
  if (b == null) return a;
  return Math.min(a, b);
}

/**
 * Une los paquetes con la disponibilidad pública. Un paquete sin filas de fase (o sin fila de
 * disponibilidad) conserva el comportamiento de siempre: precio/QR/cupo del propio paquete.
 */
export function buildTicketTypes(
  types: readonly TicketTypeRow[],
  availability: readonly AvailabilityRow[],
): TicketType[] {
  const byType = new Map<string, AvailabilityRow[]>();
  for (const row of availability) {
    const list = byType.get(row.ticket_type_id) ?? [];
    list.push(row);
    byType.set(row.ticket_type_id, list);
  }

  const result = types.map((t): TicketType => {
    const base = {
      id: t.id,
      event_id: t.event_id,
      name: t.name,
      image_url: typeof t.image_url === 'string' ? t.image_url : undefined,
    };
    const rows = byType.get(t.id) ?? [];
    const phaseRows = rows.filter((r) => r.ticket_phase_id !== null).sort((a, b) => a.position - b.position);

    if (phaseRows.length === 0) {
      // Sin fases: cupo del paquete (la fila de disponibilidad, si existe, trae lo vendido).
      const pkg = rows[0];
      const capacity = pkg?.package_capacity ?? (t.ticket_capacity == null ? null : Number(t.ticket_capacity));
      const sold = pkg?.package_sold ?? 0;
      const remaining = capacity == null ? null : Math.max(capacity - sold, 0);
      return {
        ...base,
        price: Number(t.price ?? 0),
        ticket_capacity: capacity ?? 0,
        payment_qr_url: typeof t.payment_qr_url === 'string' ? t.payment_qr_url : undefined,
        sold_out: capacity != null && sold >= capacity,
        remaining,
      };
    }

    const phases: TicketPhase[] = phaseRows.map((r) => ({
      id: r.ticket_phase_id as string,
      name: r.name,
      position: r.position,
      price: Number(r.price ?? 0),
      payment_qr_url: r.payment_qr_url ?? undefined,
      capacity: r.capacity,
      sold: r.sold ?? 0,
      remaining: r.remaining,
      is_active: r.is_active,
      sold_out: r.capacity != null && (r.sold ?? 0) >= r.capacity,
    }));
    const active = getActivePhase(phases);
    const pkgCapacity = phaseRows[0].package_capacity;
    const pkgRemaining = pkgCapacity == null ? null : Math.max(pkgCapacity - (phaseRows[0].package_sold ?? 0), 0);
    // Sin fase activa el paquete está agotado: se muestra la última fase de referencia.
    const shown = active ?? phases[phases.length - 1];

    return {
      ...base,
      price: shown.price,
      ticket_capacity: pkgCapacity ?? 0,
      payment_qr_url: shown.payment_qr_url,
      phases,
      active_phase: active,
      sold_out: active === null,
      remaining: active === null ? 0 : minRemaining(active.remaining, pkgRemaining),
    };
  });

  return result.sort((a, b) => a.price - b.price);
}
