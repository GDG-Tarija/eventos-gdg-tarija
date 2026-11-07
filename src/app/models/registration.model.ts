export type EventRole = 'ATTENDEE' | 'SPEAKER' | 'SPONSOR' | 'STAFF';
export type RegistrationStatus = 'CONFIRMED' | 'PENDING';

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
