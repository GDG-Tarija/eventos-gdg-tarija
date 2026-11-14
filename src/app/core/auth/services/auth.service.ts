import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../../supabase/supabase.client';

interface Profile {
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

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject<SupabaseClient>(SUPABASE);
  private readonly router = inject(Router);

  private syncingUserId: string | null = null;
  private lastSyncAt = 0;

  readonly user = signal<Profile | null>(null);
  readonly loading = signal(true);

  constructor() {
    this.supabase.auth.onAuthStateChange((event, session) => {

      if (event === 'SIGNED_IN') {
        // On explicit sign-in, hydrate profile; create it only if missing.
        void this.ensureProfile(session);
      } else if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        // On refresh/initial load, never write. Just hydrate the profile.
        void this.hydrateProfile(session);
      } else if (event === 'SIGNED_OUT') {
        this.user.set(null);
        this.loading.set(false);
      }
    });
  }

  private buildPartial(session: unknown): Profile | null {
    const s = session as { user?: { id: string; email?: string; user_metadata: Record<string, unknown> } } | null;

    if (!s?.user) {
      return null;
    }

    const meta = s.user.user_metadata;
    const now = new Date().toISOString();
    const firstName = (meta['given_name'] as string) ?? (meta['name'] as string) ?? '';
    const lastName = (meta['family_name'] as string) ?? '';
    const avatarUrl = (meta['avatar_url'] as string) ?? (meta['picture'] as string) ?? null;


    return {
      id: s.user.id,
      email: s.user.email ?? '',
      first_name: firstName,
      last_name: lastName,
      avatar_url: avatarUrl,
      phone: null,
      extra_info: null,
      is_staff: null,
      created_at: now,
      updated_at: now,
    };
  }

  private async hydrateProfile(session: unknown): Promise<void> {
    const partial = this.buildPartial(session);

    if (!partial) {
      this.loading.set(false);
      return;
    }

    try {
      // Read via RPC to avoid relying on direct table permissions/RLS for `public.users`.
      const { data, error } = await this.supabase.rpc('get_my_profile');
      const row = Array.isArray(data) ? data[0] : null;

      if (error) {
        this.user.set(partial);
      } else if (row) {
        this.user.set(row as unknown as Profile);
      } else {
        // No row yet (first login race). Keep partial; SIGNED_IN will upsert.
        this.user.set(partial);
      }
    } finally {
      this.loading.set(false);
    }
  }

  private async ensureProfile(session: unknown): Promise<void> {
    const partial = this.buildPartial(session);

    if (!partial) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);

    // First, try to read the profile (never overwrite user-edited fields).
    const { data: existingRows, error: readError } = await this.supabase.rpc('get_my_profile');
    const existing = Array.isArray(existingRows) ? existingRows[0] : null;

    if (!readError && existing) {
      this.user.set(existing as unknown as Profile);
      this.loading.set(false);
      return;
    }

    // Supabase can emit SIGNED_IN + INITIAL_SESSION back-to-back.
    // Avoid double RPC calls for the same user within a short window.
    const now = Date.now();
    if (this.syncingUserId === partial.id) return;
    if (now - this.lastSyncAt < 1500 && this.user()?.id === partial.id) {
      this.loading.set(false);
      return;
    }
    this.syncingUserId = partial.id;

    try {
      const { data, error } = await this.supabase
        .rpc('upsert_user_profile', {
          p_id: partial.id,
          p_email: partial.email,
          p_first_name: partial.first_name,
          p_last_name: partial.last_name,
          p_avatar_url: partial.avatar_url,
        });

      if (error) {
        console.error('[AuthService] upsert_user_profile failed:', error.code, error.message);
        this.user.set(partial);
      } else if (data && data.length > 0) {
        this.user.set(data[0] as unknown as Profile);
      } else {
        this.user.set(partial);
      }
    } catch (err) {
      console.error('[AuthService] upsert_user_profile threw:', err);
      this.user.set(partial);
    } finally {
      this.syncingUserId = null;
      this.lastSyncAt = Date.now();
      this.loading.set(false);
    }
  }

  signInWithGoogle(fragment?: string): void {
    const currentPath = window.location.pathname;

    const redirectTarget = currentPath === '/auth/login' ? '/' : currentPath;
    sessionStorage.setItem('redirect_to', redirectTarget + (fragment ? '#' + fragment : ''));

    const base = document.querySelector('base')?.getAttribute('href') ?? '/';
    const cleanBase = base.replace(/\/$/, '');
    const redirectTo = window.location.origin + cleanBase + '/auth/callback';

    this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
  }

  async signOut(): Promise<void> {
    this.loading.set(true);
    await this.supabase.auth.signOut();
    this.user.set(null);
    this.loading.set(false);
    this.router.navigateByUrl('/');
  }

  async getSession() {
    const { data } = await this.supabase.auth.getSession();
    return data.session;
  }
}
