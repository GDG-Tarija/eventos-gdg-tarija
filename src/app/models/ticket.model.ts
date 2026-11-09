export interface TicketPhase {
  id: string;
  name: string;
  position: number;
  price: number;
  payment_qr_url?: string;
  /** null = sin límite */
  capacity: number | null;
  sold: number;
  /** null = sin límite */
  remaining: number | null;
  /** Fase que recibe el próximo registro. */
  is_active: boolean;
  /** Fase sin cupo libre (se muestra tachada). */
  sold_out: boolean;
}

export interface TicketType {
  id: string;
  event_id: string;
  name: string;
  /** Precio vigente: el de la fase activa (o el del paquete si no tiene fases). */
  price: number;
  ticket_capacity: number;
  /** QR de pago vigente: el de la fase activa (o el del paquete si no tiene fases). */
  payment_qr_url?: string;
  image_url?: string;
  /** Presente solo si el paquete tiene fases (ordenadas por posición). */
  phases?: TicketPhase[];
  active_phase?: TicketPhase | null;
  /** Sin cupo: todas las fases llenas o cupo total del paquete alcanzado. */
  sold_out?: boolean;
  /** Lugares que quedan (el menor entre fase activa y paquete); null = sin límite. */
  remaining?: number | null;
}
