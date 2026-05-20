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

  readonly user = signal<Profile | null>(null);
  readonly loading = signal(true);

  constructor() {
    console.log('[AuthService] constructor — subscribing to onAuthStateChange');
    this.supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthService] onAuthStateChange event:', event, 'session userId:', session?.user?.id);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        this.handleSession(session);
      } else if (event === 'SIGNED_OUT') {
        console.log('[AuthService] SIGNED_OUT — clearing user');
        this.user.set(null);
        this.loading.set(false);
      } else if (event === 'INITIAL_SESSION') {
        console.log('[AuthService] INITIAL_SESSION — handling');
        this.handleSession(session);
      }
    });
  }

  private buildPartial(session: unknown): Profile | null {
    const s = session as { user?: { id: string; email?: string; user_metadata: Record<string, unknown> } } | null;

    if (!s?.user) {
      console.log('[AuthService] buildPartial — no user in session');
      return null;
    }

    const meta = s.user.user_metadata;
    const now = new Date().toISOString();
    const firstName = (meta['given_name'] as string) ?? (meta['name'] as string) ?? '';
    const lastName = (meta['family_name'] as string) ?? '';
    const avatarUrl = (meta['avatar_url'] as string) ?? (meta['picture'] as string) ?? null;

    console.log('[AuthService] buildPartial — metadata:', { firstName, lastName, email: s.user.email, avatarUrl });

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

  private async handleSession(session: unknown): Promise<void> {
    const partial = this.buildPartial(session);

    if (!partial) {
      console.log('[AuthService] handleSession — partial is null, loading=false');
      this.loading.set(false);
      return;
    }

    // Step 1: try SELECT (trigger should have created the row)
    try {
      console.log('[AuthService] handleSession — trying SELECT users WHERE id =', partial.id);
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', partial.id)
        .single();

      if (error) {
        console.log('[AuthService] SELECT error:', error.code, error.message, error.details);
      }

      if (!error && data) {
        console.log('[AuthService] SELECT success — user found:', data.id);
        this.user.set(data as unknown as Profile);
        this.loading.set(false);
        return;
      }
    } catch (err) {
      console.log('[AuthService] SELECT threw:', err);
    }

    // Step 2: SELECT failed or no rows — try INSERT
    try {
      console.log('[AuthService] handleSession — trying INSERT');
      const { data, error } = await this.supabase
        .from('users')
        .insert({
          id: partial.id,
          email: partial.email,
          first_name: partial.first_name,
          last_name: partial.last_name,
          avatar_url: partial.avatar_url,
        })
        .select('*')
        .single();

      if (error) {
        console.log('[AuthService] INSERT error:', error.code, error.message, error.details);
      }

      if (!error && data) {
        console.log('[AuthService] INSERT success — user created:', data.id);
        this.user.set(data as unknown as Profile);
      } else {
        console.log('[AuthService] INSERT failed or no data — falling back to partial');
        this.user.set(partial);
      }
    } catch (err) {
      console.log('[AuthService] INSERT threw:', err);
      console.log('[AuthService] Falling back to partial profile');
      this.user.set(partial);
    } finally {
      this.loading.set(false);
    }
  }

  signInWithGoogle(): void {
    const currentPath = window.location.pathname;
    console.log('[AuthService] signInWithGoogle — current path:', currentPath);

    const redirectTarget = currentPath === '/auth/login' ? '/' : currentPath;
    sessionStorage.setItem('redirect_to', redirectTarget);
    console.log('[AuthService] signInWithGoogle — saved redirect_to:', redirectTarget);

    const base = document.querySelector('base')?.getAttribute('href') ?? '/';
    const cleanBase = base.replace(/\/$/, '');
    const redirectTo = window.location.origin + cleanBase + '/auth/callback';
    console.log('[AuthService] signInWithGoogle — redirectTo:', redirectTo);

    console.log('[AuthService] signInWithGoogle — calling signInWithOAuth...');
    this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
  }

  async signOut(): Promise<void> {
    console.log('[AuthService] signOut');
    this.loading.set(true);
    await this.supabase.auth.signOut();
    this.user.set(null);
    this.loading.set(false);
    this.router.navigateByUrl('/');
  }

  async getSession() {
    console.log('[AuthService] getSession');
    const { data } = await this.supabase.auth.getSession();
    console.log('[AuthService] getSession result:', data.session?.user?.id ?? 'no session');
    return data.session;
  }
}
