import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/auth/services/auth.service';

@Component({
  selector: 'app-callback',
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="callback-container">
      <mat-spinner diameter="40" />
      <p>Completando inicio de sesión...</p>
    </div>
  `,
  styles: [`
    .callback-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      gap: 1rem;
      color: var(--mat-sys-on-surface);
    }
  `],
})
export class Callback implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    console.log('[Callback] ngOnInit');
    console.log('[Callback] URL hash:', window.location.hash);

    this.auth.getSession().then((session) => {
      console.log('[Callback] getSession resolved:', { hasSession: !!session, userId: session?.user?.id });

      const redirectTo = sessionStorage.getItem('redirect_to') || '/';
      console.log('[Callback] redirecting to:', redirectTo);
      sessionStorage.removeItem('redirect_to');

      this.router.navigateByUrl(redirectTo);
    }).catch((err) => {
      console.error('[Callback] getSession error:', err);
      this.router.navigateByUrl('/');
    });
  }
}
