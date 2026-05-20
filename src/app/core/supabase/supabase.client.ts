import { InjectionToken, Provider } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

export interface UserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  phone: string | null;
  extra_info: Record<string, unknown> | null;
  is_staff: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          avatar_url?: string | null;
          phone?: string | null;
          extra_info?: Record<string, unknown> | null;
          is_staff?: boolean | null;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          avatar_url?: string | null;
          phone?: string | null;
          extra_info?: Record<string, unknown> | null;
          is_staff?: boolean | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

export const SUPABASE = new InjectionToken<SupabaseClient<Database>>('SUPABASE');

export const supabaseProvider: Provider = {
  provide: SUPABASE,
  useFactory: () =>
    createClient<Database>(environment.supabaseUrl, environment.supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }),
};
