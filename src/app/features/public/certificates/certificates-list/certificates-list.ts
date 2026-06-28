import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Title, Meta } from '@angular/platform-browser';

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
            Mis Certificados
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
              class="gdg-btn-filled px-6 py-2.5 rounded-full text-xs font-bold"
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
              class="inline-flex items-center gap-2 mt-2 px-5 py-2.5 rounded-full bg-google-blue text-white text-xs font-bold hover:bg-blue-600 transition-colors no-underline"
            >
              <span class="material-symbols-rounded text-base" aria-hidden="true">explore</span>
              Explorar próximos eventos
            </a>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (cert of certificates(); track cert.registrationId) {
              <div class="gdg-card border border-black/5 overflow-hidden flex flex-col justify-between hover:shadow-md transition-all duration-300">
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
                    <div class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-google-blue shadow-sm border border-black/5">
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
                    class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-google-blue/10 text-google-blue hover:bg-google-blue hover:text-white transition-all duration-200 text-xs font-bold no-underline active:scale-95"
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

  constructor() {
    this.titleService.setTitle('Mis Certificados | GDG Tarija');
    this.metaService.updateTag({ name: 'description', content: 'Consulta y descarga tus certificados de asistencia a los eventos de Google Developer Groups Tarija.' });
  }

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    const user = this.auth.user();
    if (user) {
      const list = await this.certsService.listMyCertificates(user.id);
      this.certificates.set(list);
    }
    this.loading.set(false);
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
