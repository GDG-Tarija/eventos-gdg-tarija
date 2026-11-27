export type EventRole = 'ATTENDEE' | 'SPEAKER' | 'SPONSOR' | 'STAFF' | 'MENTOR' | 'PARTNER';

/** Nombre del rol de evento (lo da el cupón) para mostrar a la persona. */
export const EVENT_ROLE_LABELS: Record<EventRole, string> = {
  ATTENDEE: 'Asistente',
  SPEAKER: 'Speaker',
  SPONSOR: 'Sponsor',
  STAFF: 'Staff',
  MENTOR: 'Mentor',
  PARTNER: 'Comunidad aliada',
};

export function eventRoleLabel(role: string | null | undefined): string {
  return EVENT_ROLE_LABELS[(role ?? '') as EventRole] ?? 'Asistente';
}

/** Roles que entran al sorteo. Espejo de draw_raffle (back-office, migración 20261127015203). */
export function isRaffleRole(role: string | null | undefined): boolean {
  return role === 'ATTENDEE' || role === 'PARTNER';
}
export type RegistrationStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED';

export interface UserUpdate {
  first_name: string;
  last_name: string;
  phone: string;
}

export interface RegistrationInsert {
  event_id: string;
  user_id: string;
  ticket_type_id: string;
  event_role: EventRole;
  /** Opcional: el servidor fija el estado (PENDING/CONFIRMED) y la fase de precio al insertar. */
  status?: RegistrationStatus;
  payment_proof_url: string | null;
  custom_responses: Record<string, string>;
  coupon_id?: string | null;
}

export interface RegistrationPayload {
  userUpdate: UserUpdate;
  registration: RegistrationInsert;
}
