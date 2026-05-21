import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  template: `
    <section class="gdg-page">
      <div class="gdg-container">
        <div class="gdg-card p-10 sm:p-14 max-w-2xl mx-auto text-center">
          <span class="material-symbols-rounded text-5xl text-google-blue" aria-hidden="true">construction</span>
          <h1 class="gdg-h1 mt-4">{{ slug }}</h1>
          <p class="gdg-body mt-4">Página de detalle del evento. Próximamente.</p>
        </div>
      </div>
    </section>
  `,
})
export class EventDetail {
  readonly slug = inject(ActivatedRoute).snapshot.paramMap.get('slug') ?? '';
}
