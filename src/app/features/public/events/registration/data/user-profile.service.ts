import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../../../../../core/supabase/supabase.client';
import { UserUpdate } from '../../../../../models/registration.model';

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private readonly supabase = inject<SupabaseClient>(SUPABASE);

  async updateProfile(
    _userId: string,
    update: UserUpdate,
  ): Promise<{ first_name?: string; last_name?: string; phone?: string | null } | null> {
    // Prefer RPC to avoid REST/RLS inconsistencies in production.
    // Support both parameter naming conventions (with or without p_ prefix).
    {
      const { data, error } = await this.supabase.rpc('update_user_profile', {
        p_first_name: update.first_name,
        p_last_name: update.last_name,
        p_phone: update.phone,
      });
      if (!error) {
        // If the DB function is mis-defined and ignores last_name, fail loudly.
        const row = Array.isArray(data) ? data[0] : data;
        const updatedLastName = (row as { last_name?: string } | null)?.last_name;
        if (updatedLastName !== undefined && updatedLastName !== update.last_name) {
          throw new Error('Perfil actualizado parcialmente: last_name no cambió. Revisa la función update_user_profile en Supabase.');
        }
        return row as { first_name?: string; last_name?: string; phone?: string | null } | null;
      }
    }

    const { data, error } = await this.supabase.rpc('update_user_profile', {
      first_name: update.first_name,
      last_name: update.last_name,
      phone: update.phone,
    });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    const updatedLastName = (row as { last_name?: string } | null)?.last_name;
    if (updatedLastName !== undefined && updatedLastName !== update.last_name) {
      throw new Error('Perfil actualizado parcialmente: last_name no cambió. Revisa la función update_user_profile en Supabase.');
    }

    return row as { first_name?: string; last_name?: string; phone?: string | null } | null;
  }
}
