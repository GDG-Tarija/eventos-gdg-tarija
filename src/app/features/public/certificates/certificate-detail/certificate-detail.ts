import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Title, Meta } from '@angular/platform-browser';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom } from 'rxjs';

import { CertificatesService } from '../data/certificates.service';
import { CertificateDetailData } from '../data/certificate.model';
import { AuthService } from '../../../../core/auth/services/auth.service';

@Component({
  selector: 'app-certificate-detail',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <section class="gdg-page min-h-[calc(100vh-64px)] pb-16">
      <div class="gdg-container space-y-6 pt-6 max-w-5xl mx-auto">
        <!-- Barra de Acciones Superior -->
        <div
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-paper p-4 sm:p-5 rounded-2xl border border-black/5 shadow-sm"
        >
          <div class="flex items-center">
            <a
              [routerLink]="auth.user() ? '/certificados' : '/'"
              class="inline-flex items-center gap-2 min-h-11 text-sm font-bold text-google-blue-dark hover:underline cursor-pointer no-underline font-google"
            >
              <span class="material-symbols-rounded text-lg" aria-hidden="true">arrow_back</span>
              <span>{{ auth.user() ? 'Volver a mis certificados' : 'Ver eventos' }}</span>
            </a>
          </div>

          @if (certificate()) {
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
              @if (isOwner()) {
                <button
                  type="button"
                  class="gdg-btn-filled min-h-11 text-sm flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  [disabled]="downloadingPdf()"
                  (click)="downloadPdf()"
                >
                  <span class="material-symbols-rounded text-lg" aria-hidden="true">download</span>
                  <span>{{ downloadingPdf() ? 'Generando PDF...' : 'Descargar en PDF' }}</span>
                </button>

                <button
                  type="button"
                  class="gdg-btn-outlined min-h-11 text-sm flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer bg-transparent"
                  (click)="shareOnLinkedIn()"
                >
                  <span class="material-symbols-rounded text-lg" aria-hidden="true">share</span>
                  <span>Compartir en LinkedIn</span>
                </button>
              } @else {
                <button
                  type="button"
                  class="gdg-btn-outlined min-h-11 text-sm flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer bg-transparent"
                  (click)="copyValidationLink()"
                >
                  <span class="material-symbols-rounded text-lg" aria-hidden="true">{{
                    copied() ? 'check' : 'link'
                  }}</span>
                  <span>{{ copied() ? '¡Enlace copiado!' : 'Copiar enlace de validación' }}</span>
                </button>
              }
            </div>
          }
        </div>

        <div aria-live="polite" class="sr-only">{{ copied() ? 'Enlace copiado' : '' }}</div>

        @if (manualUrl()) {
          <input
            #manualInput
            type="text"
            readonly
            aria-label="Enlace de validación"
            class="w-full rounded-xl border border-black/10 bg-surface-paper px-4 min-h-11 text-sm"
            [value]="manualUrl()"
            (focus)="manualInput.select()"
          />
        }

        @if (pdfError()) {
          <p role="alert" class="m-0 rounded-xl bg-google-red/10 px-4 py-3 text-sm text-text-primary">
            No pudimos generar el PDF. Usa Imprimir y elige 'Guardar como PDF'.
          </p>
        }

        @if (loading()) {
          <div class="flex items-center justify-center py-20 text-text-secondary gap-3">
            <mat-progress-spinner
              mode="indeterminate"
              diameter="32"
              aria-label="Cargando certificado"
            />
            <span class="text-sm font-medium">Cargando datos del certificado...</span>
          </div>
        } @else if (loadError()) {
          <div class="gdg-card p-10 text-center space-y-4" role="alert">
            <span class="material-symbols-rounded text-6xl text-google-red block" aria-hidden="true"
              >error_outline</span
            >
            <h2 class="text-xl font-bold text-text-primary font-google">
              No pudimos cargar el certificado
            </h2>
            <p class="text-text-secondary text-sm">Revisa tu conexión e inténtalo de nuevo.</p>
            <button type="button" class="gdg-btn-filled min-h-11 text-sm" (click)="load()">
              Reintentar
            </button>
          </div>
        } @else if (!certificate()) {
          <div class="gdg-card p-10 text-center space-y-4">
            <span class="material-symbols-rounded text-6xl text-google-red block" aria-hidden="true"
              >error_outline</span
            >
            <h2 class="text-xl font-bold text-text-primary font-google">
              Certificado no encontrado
            </h2>
            <p class="text-text-secondary text-sm">
              No encontramos un certificado válido o no hay un check-in registrado para esta
              inscripción.
            </p>
            <a
              [routerLink]="auth.user() ? '/certificados' : '/'"
              class="gdg-btn-filled inline-flex items-center justify-center mt-2 min-h-11 text-sm no-underline"
            >
              {{ auth.user() ? 'Ver mis certificados' : 'Ver eventos' }}
            </a>
          </div>
        } @else {
          <!-- Contenedor del Certificado fluida y nativamente responsive en Mobile y Desktop -->
          <div class="w-full flex justify-center py-2">
            <div
              #certificateElement
              class="relative w-full max-w-[900px] aspect-[900/636] bg-surface-paper rounded-2xl overflow-hidden shadow-2xl border border-black/10 flex flex-col justify-between"
              style="container-type: inline-size; font-family: 'Google Sans', 'Outfit', sans-serif;"
            >
              <!-- Imagen de Plantilla Oficial -->
              <img
                src="https://res.cloudinary.com/dopkch3x9/image/upload/v1782673061/Certificado_de_Participacion_1_rzodb0.png"
                alt="Fondo Certificado GDG"
                class="absolute inset-0 w-full h-full object-fill z-0 pointer-events-none"
                crossorigin="anonymous"
              />

              <!-- Capa de Contenido Superpuesto con unidades vectoriales cqw -->
              <div
                class="relative z-10 w-full h-full flex flex-col justify-between p-[4cqw] px-[7cqw] text-center text-text-primary"
              >
                <!-- Espaciador Superior -->
                <div class="h-[9cqw]"></div>

                <!-- Bloque Central de Textos -->
                <div
                  class="flex-grow flex flex-col justify-center items-center space-y-[1.2cqw] px-[3cqw]"
                >
                  <!-- Título del Certificado -->
                  <h1
                    class="text-[4.2cqw] font-extrabold tracking-wide uppercase text-google-blue font-google m-0 drop-shadow-sm leading-none"
                  >
                    {{ getCertificateTitle(certificate()!.eventRole) }}
                  </h1>

                  <!-- Encabezado de Otorgación -->
                  <p
                    class="text-[1.6cqw] font-bold tracking-widest uppercase text-text-secondary m-0 pt-[0.5cqw]"
                  >
                    Otorgado a:
                  </p>

                  <!-- Nombre del Participante -->
                  <div class="py-[0.5cqw]">
                    <h2
                      class="text-[4.5cqw] font-extrabold text-text-primary font-google tracking-tight m-0 px-[4cqw] border-b-2 border-google-blue/40 inline-block pb-[0.4cqw] leading-tight"
                    >
                      {{ certificate()!.userFirstName }} {{ certificate()!.userLastName }}
                    </h2>
                  </div>

                  <!-- Párrafo descriptivo -->
                  <p
                    class="text-[1.7cqw] text-text-secondary leading-relaxed max-w-[75cqw] mx-auto m-0 pt-[0.5cqw] font-medium"
                  >
                    Por su participación activa y destacada en el evento
                    <strong class="text-text-primary font-bold">{{
                      certificate()!.eventTitle
                    }}</strong
                    >, adquiriendo y aplicando conocimientos clave en tecnología y desarrollo junto
                    a la comunidad de Google Developer Groups Tarija.
                  </p>
                </div>

                <!-- Pie del Certificado elevado por encima de las firmas -->
                <div
                  class="h-[16cqw] flex items-start justify-between text-[1.4cqw] text-text-secondary px-[3cqw] pt-0 pb-[7cqw]"
                >
                  <div class="text-left space-y-[0.2cqw]">
                    <p class="m-0 font-bold text-text-primary">
                      Tarija, {{ formatDate(certificate()!.eventDateStart) }}
                    </p>
                    <p class="m-0 text-[1.2cqw] text-text-secondary font-medium">
                      Asistencia verificada por Check-in
                    </p>
                  </div>
                  <div class="text-right space-y-[0.2cqw]">
                    <p class="m-0 font-mono text-[1.2cqw] text-text-secondary font-medium">
                      ID: {{ certificate()!.registrationId }}
                    </p>
                    <span
                      class="inline-flex items-center gap-[0.4cqw] text-google-green font-bold text-[1.3cqw]"
                    >
                      <span class="material-symbols-rounded text-[1.5cqw]" aria-hidden="true"
                        >verified</span
                      >
                      <span>Documento Oficial GDG</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class CertificateDetail implements OnInit {
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly certsService = inject(CertificatesService);
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);

  @ViewChild('certificateElement') private readonly certificateElement!: ElementRef<HTMLDivElement>;

  readonly loading = signal(true);
  readonly downloadingPdf = signal(false);
  readonly certificate = signal<CertificateDetailData | null>(null);
  readonly loadError = signal(false);
  readonly pdfError = signal(false);
  readonly copied = signal(false);
  readonly manualUrl = signal('');

  // toObservable DEBE declararse en el contexto de inyección (inicialización de campos de clase)
  private readonly authLoading$ = toObservable(this.auth.loading);

  get id(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  async ngOnInit(): Promise<void> {
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
    this.loadError.set(false);
    let data: CertificateDetailData | null = null;
    try {
      data = await this.certsService.getCertificateById(this.id);
    } catch {
      this.loadError.set(true);
    }
    this.certificate.set(data);
    this.loading.set(false);

    if (data) {
      const pageTitle = `Certificado de ${data.userFirstName} ${data.userLastName} - ${data.eventTitle} | GDG Tarija`;
      this.titleService.setTitle(pageTitle);

      const description = `Certificado oficial de asistencia y participación de ${data.userFirstName} ${data.userLastName} en el evento "${data.eventTitle}" de la comunidad Google Developer Groups Tarija.`;
      const bannerUrl = data.eventBannerUrl || 'https://res.cloudinary.com/dopkch3x9/image/upload/v1779579233/GDG_Bevy_DefaultEventBanner_VKOwYjb_c913np.webp';
      const pageUrl = window.location.href;

      // Meta estándar
      this.metaService.updateTag({ name: 'description', content: description });

      // Open Graph (Facebook, LinkedIn, Slack, WhatsApp)
      this.metaService.updateTag({ property: 'og:title', content: pageTitle }, "property='og:title'");
      this.metaService.updateTag({ property: 'og:description', content: description }, "property='og:description'");
      this.metaService.updateTag({ property: 'og:image', content: bannerUrl }, "property='og:image'");
      this.metaService.updateTag({ property: 'og:url', content: pageUrl }, "property='og:url'");
      this.metaService.updateTag({ property: 'og:type', content: 'website' }, "property='og:type'");

      // Twitter Cards (Twitter / X)
      this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' }, "name='twitter:card'");
      this.metaService.updateTag({ name: 'twitter:title', content: pageTitle }, "name='twitter:title'");
      this.metaService.updateTag({ name: 'twitter:description', content: description }, "name='twitter:description'");
      this.metaService.updateTag({ name: 'twitter:image', content: bannerUrl }, "name='twitter:image'");
    }
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-BO', {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
    }).format(date);
  }

  getCertificateTitle(role: string): string {
    switch (role) {
      case 'SPEAKER':
        return 'Certificado de Expositor';
      case 'STAFF':
        return 'Certificado de Staff';
      case 'SPONSOR':
        return 'Certificado de Patrocinador';
      default:
        return 'Certificado de Participación';
    }
  }

  async downloadPdf(): Promise<void> {
    if (this.downloadingPdf() || !this.certificateElement?.nativeElement) return;
    this.downloadingPdf.set(true);

    this.pdfError.set(false);

    // Se captura un clon fuera de pantalla para no redimensionar el certificado visible.
    const clone = this.certificateElement.nativeElement.cloneNode(true) as HTMLDivElement;
    clone.style.width = '900px';
    clone.style.maxWidth = '900px';
    clone.style.height = '636px';
    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:fixed;left:-10000px;top:0;width:900px;';
    host.appendChild(clone);
    document.body.appendChild(host);

    try {
      const html2pdf = await this.loadHtml2Pdf();
      const cert = this.certificate();
      const cleanName = `${cert?.userFirstName}_${cert?.userLastName}`.replace(/\s+/g, '_');
      const fileName = `Certificado_${cleanName}_GDG.pdf`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const opt: any = {
        margin: 0,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'px', format: [900, 636], orientation: 'landscape' },
      };

      await html2pdf().set(opt).from(clone).save();
    } catch (err) {
      console.error('[CertificateDetail] Error al generar el PDF:', err);
      this.pdfError.set(true);
      window.print();
    } finally {
      host.remove();
      this.downloadingPdf.set(false);
    }
  }

  isOwner(): boolean {
    const user = this.auth.user();
    const cert = this.certificate();
    if (!user || !cert) return false;
    return user.id === cert.userId;
  }

  copyValidationLink(): void {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(
      () => {
        this.manualUrl.set('');
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      },
      (err) => {
        console.error('Error al copiar el enlace:', err);
        this.manualUrl.set(url);
      },
    );
  }

  shareOnLinkedIn(): void {
    const cert = this.certificate();
    if (!cert) return;

    const title = encodeURIComponent(
      `${this.getCertificateTitle(cert.eventRole)} - ${cert.eventTitle}`,
    );
    const pageUrl = encodeURIComponent(window.location.href);
    const org = encodeURIComponent('GDG Tarija');
    const year = cert.eventDateStart.getFullYear();
    const month = cert.eventDateStart.getMonth() + 1;

    const linkedInUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${title}&organizationName=${org}&issueYear=${year}&issueMonth=${month}&certUrl=${pageUrl}&certId=${cert.registrationId}`;

    window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async loadHtml2Pdf(): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).html2pdf) return (window as any).html2pdf;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src =
        'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      script.onload = () => resolve((window as any).html2pdf);
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }
}
