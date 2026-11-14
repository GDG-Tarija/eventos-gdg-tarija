import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Title, Meta } from '@angular/platform-browser';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom } from 'rxjs';

import { AuthService } from '../../../../core/auth/services/auth.service';
import { CertificatesService } from '../data/certificates.service';
import { CertificateItem } from '../data/certificate.model';

@Component({
  selector: 'app-certificates-list',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <section class="gdg-page min-h-[calc(100vh-64px)] pb-16">
      <div class="gdg-container space-y-8 pt-6">
        <!-- Encabezado -->
        <div class="space-y-2">
          <h1 class="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight font-google">
            Mis certificados
          </h1>
          <p class="text-text-secondary text-sm sm:text-base max-w-2xl">
            Aquí encontrarás los certificados de asistencia correspondientes a los eventos en los que registraste tu check-in.
          </p>
        </div>

        @if (auth.loading() || loading()) {
          <div class="flex items-center justify-center py-16 text-text-secondary gap-3">
            <mat-progress-spinner mode="indeterminate" diameter="32" aria-label="Cargando certificados" />
            <span class="text-sm font-medium">Cargando tus certificados...</span>
          </div>
        } @else if (error()) {
          <div class="gdg-card p-8 sm:p-12 text-center space-y-4 max-w-xl mx-auto" role="alert">
            <span class="material-symbols-rounded text-6xl text-google-red block" aria-hidden="true">error_outline</span>
            <h2 class="text-xl font-bold text-text-primary font-google">No pudimos cargar tus certificados</h2>
            <p class="text-text-secondary text-sm">Revisa tu conexión e inténtalo de nuevo.</p>
            <button type="button" class="gdg-btn-filled min-h-11 text-sm" (click)="load()">Reintentar</button>
          </div>
        } @else if (!auth.user()) {
          <div class="gdg-card p-8 sm:p-12 text-center space-y-4 max-w-xl mx-auto">
            <span class="material-symbols-rounded text-6xl text-google-blue block" aria-hidden="true">
              workspace_premium
            </span>
            <h2 class="text-xl font-bold text-text-primary font-google">Inicia sesión para ver tus certificados</h2>
            <p class="text-text-secondary text-sm">
              Debes acceder con tu cuenta para consultar los certificados de los eventos a los que has asistido.
            </p>
            <button
              mat-flat-button
              type="button"
              class="gdg-btn-filled min-h-11 text-sm"
              (click)="auth.signInWithGoogle()"
            >
              Iniciar sesión con Google
            </button>
          </div>
        } @else if (certificates().length === 0) {
          <div class="gdg-card p-10 sm:p-16 text-center space-y-4 max-w-2xl mx-auto">
            <span class="material-symbols-rounded text-6xl text-text-muted/60 block" aria-hidden="true">
              card_membership
            </span>
            <h2 class="text-xl font-bold text-text-primary font-google">No tienes certificados disponibles</h2>
            <p class="text-text-secondary text-sm">
              Los certificados se generan automáticamente una vez que asistes a un evento y se registra tu check-in de ingreso.
            </p>
            <a
              routerLink="/"
              class="gdg-btn-filled inline-flex items-center justify-center gap-2 mt-2 min-h-11 text-sm no-underline"
            >
              <span class="material-symbols-rounded text-base" aria-hidden="true">explore</span>
              Explora los próximos eventos
            </a>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (cert of certificates(); track cert.registrationId) {
              <div class="gdg-card border border-black/5 overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow duration-200">
                <div class="space-y-4">
                  <!-- Banner / Miniatura -->
                  <div class="h-36 w-full bg-black/5 relative overflow-hidden">
                    @if (cert.eventBannerUrl) {
                      <img [src]="cert.eventBannerUrl" [alt]="cert.eventTitle" class="w-full h-full object-cover" />
                    } @else {
                      <img
                        src="https://res.cloudinary.com/dopkch3x9/image/upload/v1779579233/GDG_Bevy_DefaultEventBanner_VKOwYjb_c913np.webp"
                        [alt]="cert.eventTitle"
                        class="w-full h-full object-cover"
                      />
                    }
                    <div class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-google-blue-dark shadow-sm border border-black/5">
                      {{ getRoleLabel(cert.eventRole) }}
                    </div>
                  </div>

                  <!-- Info -->
                  <div class="p-5 space-y-3">
                    <h3 class="text-lg font-bold text-text-primary font-google leading-snug line-clamp-2">
                      {{ cert.eventTitle }}
                    </h3>
                    <div class="flex items-center gap-2 text-xs text-text-secondary">
                      <span class="material-symbols-rounded text-sm text-google-blue" aria-hidden="true">calendar_month</span>
                      <span>{{ formatDate(cert.eventDateStart) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Footer Card -->
                <div class="p-5 pt-0">
                  <a
                    [routerLink]="['/certificados', cert.registrationId]"
                    class="gdg-btn w-full inline-flex items-center justify-center gap-2 px-4 min-h-11 bg-google-blue/10 text-google-blue-dark hover:bg-google-blue-dark hover:text-white text-sm no-underline"
                  >
                    <span class="material-symbols-rounded text-base" aria-hidden="true">workspace_premium</span>
                    <span>Ver certificado</span>
                  </a>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class CertificatesList implements OnInit {
  readonly auth = inject(AuthService);
  private readonly certsService = inject(CertificatesService);
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);

  readonly loading = signal(true);
  readonly certificates = signal<CertificateItem[]>([]);
  readonly error = signal(false);

  // toObservable DEBE llamarse en un contexto de inyección (inicialización de campos de la clase)
  private readonly authLoading$ = toObservable(this.auth.loading);

  constructor() {
    const pageTitle = 'Mis certificados | GDG Tarija';
    const description = 'Consulta, valida y descarga tus certificados oficiales de participación en los eventos de la comunidad Google Developer Groups Tarija.';
    const defaultImage = 'https://res.cloudinary.com/dopkch3x9/image/upload/v1779579233/GDG_Bevy_DefaultEventBanner_VKOwYjb_c913np.webp';

    this.titleService.setTitle(pageTitle);

    // Meta estándar
    this.metaService.updateTag({ name: 'description', content: description });

    // Open Graph
    this.metaService.updateTag({ property: 'og:title', content: pageTitle }, "property='og:title'");
    this.metaService.updateTag({ property: 'og:description', content: description }, "property='og:description'");
    this.metaService.updateTag({ property: 'og:image', content: defaultImage }, "property='og:image'");
    this.metaService.updateTag({ property: 'og:type', content: 'website' }, "property='og:type'");

    // Twitter Cards
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' }, "name='twitter:card'");
    this.metaService.updateTag({ name: 'twitter:title', content: pageTitle }, "name='twitter:title'");
    this.metaService.updateTag({ name: 'twitter:description', content: description }, "name='twitter:description'");
    this.metaService.updateTag({ name: 'twitter:image', content: defaultImage }, "name='twitter:image'");
  }

  async ngOnInit(): Promise<void> {
    this.loading.set(true);

    // Esperar de manera reactiva a que termine auth.loading
    await firstValueFrom(
      this.authLoading$.pipe(
        filter(loading => !loading)
      )
    );

    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try {
      const user = this.auth.user();
      if (user) this.certificates.set(await this.certsService.listMyCertificates(user.id));
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-BO', {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
    }).format(date);
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case 'SPEAKER':
        return 'Speaker';
      case 'STAFF':
        return 'Staff';
      case 'SPONSOR':
        return 'Sponsor';
      default:
        return 'Asistente';
    }
  }
}
