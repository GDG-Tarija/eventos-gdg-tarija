export interface TicketType {
  id: string;
  event_id: string;
  name: string;
  price: number;
  ticket_capacity: number;
  payment_qr_url?: string;
  image_url?: string;
}
