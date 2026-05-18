export type EntityState = 'ACTIVE' | 'INACTIVE';

export interface Sponsor {
  id: string;
  name: string | null;
  description: string | null;
  score: string | null;
  state: EntityState;
  created_at?: string | Date;
  updated_at?: string | Date;
}
