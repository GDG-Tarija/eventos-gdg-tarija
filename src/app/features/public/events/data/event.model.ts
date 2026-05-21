export interface Event {
  id: string;
  title: string;
  slug: string;
  event_type: 'MEETUP' | 'CONFERENCE' | 'HACKATHON' | 'WORKSHOP';
  capacity: number;
  date_start: Date;
  date_end?: Date;
  is_published: boolean;
  description?: string;
  image_url?: string;
  logo_url?: string;
  banner_url?: string;
  location_type: 'PHYSICAL' | 'VIRTUAL' | 'HYBRID';
  location_name?: string;
  address_link?: string;
  category?: string;
  available_spots?: number;
  is_full?: boolean;
}
