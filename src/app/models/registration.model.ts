export type EventRole = 'ATTENDEE';
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
  status: RegistrationStatus;
  payment_proof_url: string | null;
  custom_responses: Record<string, string>;
}

export interface RegistrationPayload {
  userUpdate: UserUpdate;
  registration: RegistrationInsert;
}
