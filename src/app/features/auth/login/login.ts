import { Component, OnInit, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/auth/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [MatProgressSpinnerModule],
  template: `
    <section class="gdg-page bg-surface-main">
      <div class="gdg-container py-10">
        <div class="gdg-card mx-auto w-full max-w-xl p-10 sm:p-12 text-center">
          <div class="mx-auto mb-4">
            <mat-progress-spinner mode="indeterminate" diameter="36" aria-label="Iniciando sesión" />
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-text-primary">Redirigiendo a Google...</h1>
          <p class="mt-2 text-text-secondary">Si no pasa nada, revisa que no estés bloqueando popups.</p>
        </div>
      </div>
    </section>
  `,
})
export class Login implements OnInit {
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    // This route exists only as a fallback. We start OAuth immediately.
    this.auth.signInWithGoogle();
  }
}
