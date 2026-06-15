export interface Session {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  capacity: number;
  time_slot: number;
  track_id: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SessionWithTrack extends Session {
  track_name: string | null;
  enrolled_count: number;
}

export interface SessionSlotGroup {
  slot: number;
  sessions: SessionWithTrack[];
}
