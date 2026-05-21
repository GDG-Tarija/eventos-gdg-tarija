import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/services/auth.service';

@Component({
  selector: 'app-home',
  imports: [MatButtonModule, RouterLink],
  template: `
    <section class="gdg-page">
      <div class="gdg-container">
        <div class="rounded-3xl border border-black/5 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden">
          <div class="p-10 sm:p-14 relative">
            <div class="absolute inset-0 opacity-20 pointer-events-none"
                 style="background: radial-gradient(circle at 20% 20%, var(--gdg-google-blue-light), transparent 45%), radial-gradient(circle at 80% 30%, var(--gdg-google-green-light), transparent 45%), radial-gradient(circle at 60% 80%, var(--gdg-google-yellow-light), transparent 45%), radial-gradient(circle at 20% 80%, var(--gdg-google-red-light), transparent 45%);">
            </div>

            <div class="relative">
              <h1 class="gdg-h1 font-google">GDG Tarija</h1>
              <p class="gdg-body mt-4 max-w-2xl">
                Eventos para la comunidad de desarrolladores. Charlas, talleres y networking con la vibra de Google I/O.
              </p>

              <div class="mt-8 flex flex-wrap gap-3">
                @if (auth.user()) {
                  <a mat-flat-button color="primary" routerLink="/dashboard" class="gdg-btn-filled">
                    Ir al dashboard
                  </a>
                } @else {
                  <a mat-flat-button color="primary" routerLink="/auth/login" class="gdg-btn-filled">
                    Iniciar sesión
                  </a>
                }

                <a mat-stroked-button routerLink="/" class="gdg-btn-outlined">
                  Ver próximos eventos
                </a>
              </div>

              <div class="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="gdg-card p-5">
                  <div class="flex items-center gap-2 text-google-blue font-semibold">
                    <span class="material-symbols-rounded" aria-hidden="true">event</span>
                    <span>Eventos</span>
                  </div>
                  <p class="mt-2 text-text-secondary">Calendario, cupos y registros.</p>
                </div>
                <div class="gdg-card p-5">
                  <div class="flex items-center gap-2 text-google-green font-semibold">
                    <span class="material-symbols-rounded" aria-hidden="true">groups</span>
                    <span>Comunidad</span>
                  </div>
                  <p class="mt-2 text-text-secondary">Organizadores, speakers y asistentes.</p>
                </div>
                <div class="gdg-card p-5">
                  <div class="flex items-center gap-2 text-google-red font-semibold">
                    <span class="material-symbols-rounded" aria-hidden="true">rocket_launch</span>
                    <span>Experiencia</span>
                  </div>
                  <p class="mt-2 text-text-secondary">Diseño vibrante, simple y rápido.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class Home {
  readonly auth = inject(AuthService);
}
