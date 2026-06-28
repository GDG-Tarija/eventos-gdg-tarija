import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Title, Meta } from '@angular/platform-browser';

import { CertificatesService } from '../data/certificates.service';
import { CertificateDetailData } from '../data/certificate.model';

@Component({
  selector: 'app-certificate-detail',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <section class="gdg-page min-h-[calc(100vh-64px)] pb-16">
      <div class="gdg-container space-y-6 pt-6 max-w-5xl mx-auto">
        <!-- Barra de Acciones Superior -->
        <div class="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-black/5 shadow-sm">
          <div class="flex items-center gap-2">
            <a
              routerLink="/certificados"
              class="inline-flex items-center gap-1.5 text-xs font-bold text-google-blue hover:underline cursor-pointer no-underline"
            >
              <span class="material-symbols-rounded text-base" aria-hidden="true">arrow_back</span>
              <span>Volver a Mis Certificados</span>
            </a>
          </div>

          @if (certificate()) {
            <div class="flex items-center gap-2.5">
              <button
                mat-flat-button
                type="button"
                class="gdg-btn-filled px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                [disabled]="downloadingPdf()"
                (click)="downloadPdf()"
              >
                <span class="material-symbols-rounded text-sm" aria-hidden="true">download</span>
                <span>{{ downloadingPdf() ? 'Generando PDF...' : 'Descargar en PDF' }}</span>
              </button>

              <button
                type="button"
                class="px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 bg-[#0A66C2] text-white hover:bg-[#004182] transition-colors cursor-pointer border-0 active:scale-95 shadow-sm"
                (click)="shareOnLinkedIn()"
              >
                <span class="material-symbols-rounded text-sm" aria-hidden="true">share</span>
                <span>Compartir en LinkedIn</span>
              </button>
            </div>
          }
        </div>

        @if (loading()) {
          <div class="flex items-center justify-center py-20 text-text-secondary gap-3">
            <mat-progress-spinner mode="indeterminate" diameter="32" aria-label="Cargando certificado" />
            <span class="text-sm font-medium">Cargando datos del certificado...</span>
          </div>
        } @else if (!certificate()) {
          <div class="gdg-card p-10 text-center space-y-4">
            <span class="material-symbols-rounded text-6xl text-google-red block" aria-hidden="true">error_outline</span>
            <h2 class="text-xl font-bold text-text-primary font-google">Certificado no encontrado</h2>
            <p class="text-text-secondary text-sm">
              No se encontró un certificado válido o no cuentas con registro de check-in para esta inscripción.
            </p>
            <a
              routerLink="/certificados"
              class="inline-flex items-center gap-2 mt-2 px-5 py-2.5 rounded-full bg-google-blue text-white text-xs font-bold no-underline"
            >
              Ver mis certificados
            </a>
          </div>
        } @else {
          <!-- Contenedor del Certificado con plantilla visual oficial en imagen de fondo -->
          <div class="w-full overflow-x-auto pb-4 flex justify-center">
            <div
              #certificateElement
              class="relative w-[900px] h-[636px] bg-white rounded-2xl overflow-hidden shadow-2xl border border-black/10 shrink-0 select-none"
              style="font-family: 'Google Sans', 'Outfit', sans-serif;"
            >
              <!-- Imagen de Plantilla Oficial -->
              <img
                src="https://res.cloudinary.com/dopkch3x9/image/upload/v1782673061/Certificado_de_Participacion_1_rzodb0.png"
                alt="Fondo Certificado GDG"
                class="absolute inset-0 w-full h-full object-fill z-0 pointer-events-none"
                crossorigin="anonymous"
              />

              <!-- Capa de Contenido Superpuesto -->
              <div class="relative z-10 w-full h-full flex flex-col justify-between p-10 px-16 text-center text-[#202124]">
                <!-- Espaciador Superior equilibrado -->
                <div class="h-20"></div>

                <!-- Bloque Central de Textos (Mayor tamaño y alineación equilibrada) -->
                <div class="flex-grow flex flex-col justify-center items-center space-y-3.5 px-6 pt-1">
                  <!-- Título del Certificado -->
                  <h1 class="text-4xl sm:text-5xl font-extrabold tracking-wide uppercase text-[#1a73e8] font-google m-0 drop-shadow-sm">
                    {{ getCertificateTitle(certificate()!.eventRole) }}
                  </h1>

                  <!-- Encabezado de Otorgación -->
                  <p class="text-sm sm:text-base font-bold tracking-widest uppercase text-text-secondary m-0 pt-1">
                    Otorgado a:
                  </p>

                  <!-- Nombre del Participante -->
                  <div class="py-1">
                    <h2 class="text-4xl sm:text-5xl font-extrabold text-[#202124] font-google tracking-tight m-0 px-8 border-b-2 border-google-blue/40 inline-block pb-1.5">
                      {{ certificate()!.userFirstName }} {{ certificate()!.userLastName }}
                    </h2>
                  </div>

                  <!-- Párrafo descriptivo en tamaño mayor -->
                  <p class="text-sm sm:text-base text-text-secondary leading-relaxed max-w-2xl mx-auto m-0 pt-2 font-medium">
                    Por su participación activa y destacada en el evento <strong class="text-text-primary font-bold">{{ certificate()!.eventTitle }}</strong>, adquiriendo y aplicando conocimientos clave en tecnología y desarrollo junto a la comunidad de Google Developer Groups Tarija.
                  </p>
                </div>

                <!-- Pie del Certificado elevado para quedar por encima de las firmas -->
                <div class="h-32 flex items-center justify-between text-xs text-text-secondary px-6 pb-10">
                  <div class="text-left space-y-0.5">
                    <p class="m-0 font-bold text-text-primary">Tarija, {{ formatDate(certificate()!.eventDateStart) }}</p>
                    <p class="m-0 text-[11px] text-text-muted">Asistencia verificada por Check-in</p>
                  </div>
                  <div class="text-right space-y-0.5">
                    <p class="m-0 font-mono text-[11px] text-text-muted">ID: {{ certificate()!.registrationId }}</p>
                    <span class="inline-flex items-center gap-1 text-google-green font-bold text-xs">
                      <span class="material-symbols-rounded text-sm" aria-hidden="true">verified</span>
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
  private readonly route = inject(ActivatedRoute);
  private readonly certsService = inject(CertificatesService);
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);

  @ViewChild('certificateElement') private readonly certificateElement!: ElementRef<HTMLDivElement>;

  readonly loading = signal(true);
  readonly downloadingPdf = signal(false);
  readonly certificate = signal<CertificateDetailData | null>(null);

  get id(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    const data = await this.certsService.getCertificateById(this.id);
    this.certificate.set(data);
    this.loading.set(false);

    if (data) {
      const pageTitle = `Certificado - ${data.eventTitle} | GDG Tarija`;
      this.titleService.setTitle(pageTitle);
      this.metaService.updateTag({ name: 'description', content: `Certificado de asistencia de ${data.userFirstName} ${data.userLastName} al evento ${data.eventTitle}.` });
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

    try {
      // Cargar dinámicamente html2pdf para no recargar bundles innecesariamente
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const html2pdf = await this.loadHtml2Pdf();
      const element = this.certificateElement.nativeElement;
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

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('[CertificateDetail] Error al generar el PDF:', err);
      // Fallback nativo de impresión si falla html2pdf
      window.print();
    } finally {
      this.downloadingPdf.set(false);
    }
  }

  shareOnLinkedIn(): void {
    const cert = this.certificate();
    if (!cert) return;

    const title = encodeURIComponent(`${this.getCertificateTitle(cert.eventRole)} - ${cert.eventTitle}`);
    const pageUrl = encodeURIComponent(window.location.href);
    const org = encodeURIComponent('Google Developer Groups Tarija');
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
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      script.onload = () => resolve((window as any).html2pdf);
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }
}
