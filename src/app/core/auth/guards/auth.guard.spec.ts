import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { routes } from '../../../app.routes';
import { SUPABASE } from '../../supabase/supabase.client';
import { AuthService } from '../services/auth.service';

describe('Acceso a Mis tickets', () => {
  const getSession = vi.fn();
  const signInWithOAuth = vi.fn();
  const originalUrl = window.location.href;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: SUPABASE, useValue: { auth: { getSession, signInWithOAuth, onAuthStateChange: vi.fn() } } },
      ],
    });
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    window.history.replaceState(null, '', originalUrl);
    sessionStorage.removeItem('redirect_to');
  });

  it('conserva el destino para volver a la ticketera después del login', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    await router.navigateByUrl('/mis-tickets');
    const loginUrl = router.parseUrl(router.url);
    expect(loginUrl.root.children['primary'].segments.map(s => s.path)).toEqual(['auth', 'login']);
    expect(loginUrl.queryParams['returnUrl']).toBe('/mis-tickets');

    window.history.replaceState(null, '', router.url);
    TestBed.inject(AuthService).signInWithGoogle();
    expect(sessionStorage.getItem('redirect_to')).toBe('/mis-tickets');
  });

  it('abre la ticketera directamente con una sesión', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'asistente' } } } });
    await router.navigateByUrl('/mis-tickets');
    expect(router.url).toBe('/mis-tickets');
  });

  it.each(['/dashboard', '/dashboard/admin/sponsor'])('mantiene el regreso a la portada desde %s', async (path) => {
    getSession.mockResolvedValue({ data: { session: null } });
    await router.navigateByUrl(path);
    expect(router.url).toBe('/auth/login');

    window.history.replaceState(null, '', router.url);
    TestBed.inject(AuthService).signInWithGoogle();
    expect(sessionStorage.getItem('redirect_to')).toBe('/');
  });

  it('vuelve al formulario cuando el login se inicia desde el evento', () => {
    window.history.replaceState(null, '', '/e/devfest');
    TestBed.inject(AuthService).signInWithGoogle('registro');
    expect(sessionStorage.getItem('redirect_to')).toBe('/e/devfest#registro');
  });

  it.each(['https://example.com/', '//example.com/', '/dashboard'])('descarta el destino de login %s', (returnUrl) => {
    window.history.replaceState(null, '', '/auth/login?returnUrl=' + encodeURIComponent(returnUrl));
    TestBed.inject(AuthService).signInWithGoogle();
    expect(sessionStorage.getItem('redirect_to')).toBe('/');
  });
});
