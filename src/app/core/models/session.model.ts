export type SessionLevel = 'Basico' | 'Intermedio' | 'Avanzado';

export interface Session {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  capacity: number;
  time_slot: number;
  track_id: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  speaker: string | null;
  city: string | null;
  level: SessionLevel | null;
  topic: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SessionWithTrack extends Session {
  track_name: string | null;
  enrolled_count: number;
}

/** @deprecated use SessionDateGroup */
export interface SessionSlotGroup {
  slot: number;
  sessions: SessionWithTrack[];
}

export interface SessionTimeGroup {
  startTime: string | null;
  endTime: string | null;
  sessions: SessionWithTrack[];
}

export interface SessionDateGroup {
  date: string | null;
  timeGroups: SessionTimeGroup[];
}
