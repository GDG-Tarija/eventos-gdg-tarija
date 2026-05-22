import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../../../../../core/supabase/supabase.client';
import { UserUpdate } from '../../../../../models/registration.model';

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private readonly supabase = inject<SupabaseClient>(SUPABASE);

  async updateProfile(userId: string, update: UserUpdate): Promise<void> {
    void userId;
    // Prefer RPC to avoid REST/RLS inconsistencies in production.
    // The function enforces auth.uid() = users.id.
    const { error } = await this.supabase.rpc('update_user_profile', {
      p_first_name: update.first_name,
      p_last_name: update.last_name,
      p_phone: update.phone,
    });

    if (error) throw error;
  }
}
