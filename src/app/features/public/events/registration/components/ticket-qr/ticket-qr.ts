import { Component, computed, effect, input, signal } from '@angular/core';

@Component({
  selector: 'app-ticket-qr',
  standalone: true,
  template: `
    <div class="mx-auto flex w-fit flex-col items-center gap-2 rounded-3xl border border-black/10 bg-white p-4 shadow-sm">
      @if (failed()) {
        <p class="m-0 text-xs text-[#5f6368]">Código de tu inscripción:</p>
        <p class="m-0 max-w-[200px] select-all break-all text-center font-mono text-xs text-[#202124]">
          {{ registrationId() }}
        </p>
      } @else {
        @if (dataUrl(); as src) {
          <img
            [src]="src"
            width="200"
            height="200"
            class="size-[200px]"
            [alt]="'Código QR de tu entrada para ' + (eventTitle() ?? 'el evento')"
          />
        } @else {
          <div class="size-[200px] rounded-lg bg-black/5" aria-hidden="true"></div>
        }
        <p class="m-0 text-xs text-[#5f6368]">Muestra este código en la entrada</p>
        <p class="m-0 font-mono text-sm font-bold tracking-wider text-[#202124]">{{ shortCode() }}</p>
      }
    </div>
  `,
})
export class TicketQr {
  readonly registrationId = input.required<string>();
  readonly eventTitle = input<string>();

  readonly dataUrl = signal<string | null>(null);
  readonly failed = signal(false);
  readonly shortCode = computed(() => this.registrationId().slice(0, 8));

  constructor() {
    effect(() => {
      const id = this.registrationId();
      this.dataUrl.set(null);
      this.failed.set(false);
      void this.generate(id);
    });
  }

  private async generate(id: string): Promise<void> {
    try {
      // Import dinámico: qrcode queda fuera del bundle inicial.
      const QRCode = (await import('qrcode')).default;
      const url = await QRCode.toDataURL(id, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 512,
        color: { dark: '#202124', light: '#FFFFFF' },
      });
      if (id === this.registrationId()) this.dataUrl.set(url);
    } catch (e) {
      console.error('[TicketQr] Error generating QR:', e);
      this.failed.set(true);
    }
  }
}
