import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [MatButtonModule, RouterLink],
  template: `
    <section class="home-container">
      <h1>GDG Tarija</h1>
      <p class="subtitle">Eventos para la comunidad de desarrolladores</p>

      <div class="actions">
        <a mat-raised-button routerLink="/auth/login">Iniciar sesión</a>
      </div>
    </section>
  `,
  styles: [`
    .home-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      text-align: center;
      padding: 2rem;
      gap: 1rem;
    }

    h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin: 0;
    }

    .subtitle {
      font-size: 1.1rem;
      color: var(--mat-sys-on-surface-variant);
      max-width: 480px;
    }

    .actions {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
    }
  `],
})
export class Home {}
