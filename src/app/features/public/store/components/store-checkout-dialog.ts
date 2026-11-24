import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/services/auth.service';
import { formatBs } from '../data/money';
import { toOrderItems } from '../data/store-cart';
import { validateProofFile } from '../data/store-checkout';
import { StoreError, toStoreError } from '../data/store-errors';
import { MAX_PROOFS_PER_EVENT, PROOF_MIME_TYPES } from '../data/store.model';
import { StoreService } from '../data/store.service';
import { StoreSession } from '../store-session';
import { StoreCart } from './store-cart';

export type CheckoutStep = 'cart' | 'pay' | 'done';

export interface StoreCheckoutDialogData {
  startAt: Exclude<CheckoutStep, 'done'>;
}

/** Resultado del diálogo: el id de la compra creada, o undefined si se cerró sin comprar. */
export type StoreCheckoutResult = string | undefined;

const PHASE_LABEL = {
  idle: 'Confirmar compra',
  uploading: 'Subiendo comprobante…',
  creating: 'Registrando tu compra…',
  verifying: 'Comprobando tu compra…',
} as const;

@Component({
  selector: 'app-store-checkout-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatProgressSpinnerModule, RouterLink, StoreCart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './store-checkout-dialog.html',
  styleUrls: ['./store-dialog.scss', './store-checkout-dialog.scss'],
})
export class StoreCheckoutDialog {
  protected readonly ref = inject(MatDialogRef<StoreCheckoutDialog, StoreCheckoutResult>);
  protected readonly session = inject(StoreSession);
  private readonly auth = inject(AuthService);
  private readonly store = inject(StoreService);
  private readonly data = inject<StoreCheckoutDialogData>(MAT_DIALOG_DATA);

  protected readonly step = signal<CheckoutStep>(this.data.startAt);
  protected readonly error = signal<string | null>(null);
  protected readonly proofError = signal<string | null>(null);
  protected readonly proofsUsed = signal<number | null>(null);
  protected readonly previewUrl = signal<string | null>(null);
  protected readonly createdOrderId = signal<string | null>(null);
  protected readonly createdTotal = signal(0);

  private readonly checkout = computed(() => {
    const userId = this.auth.user()?.id;
    return userId ? this.session.checkoutFor(userId) : null;
  });
  protected readonly phase = computed(() => this.checkout()?.phase() ?? 'idle');
  protected readonly submitting = computed(() => this.phase() !== 'idle');
  protected readonly phaseLabel = computed(() => PHASE_LABEL[this.phase()]);

  protected readonly accept = PROOF_MIME_TYPES.join(',');
  protected readonly maxProofs = MAX_PROOFS_PER_EVENT;
  protected readonly bs = formatBs;
  protected readonly total = computed(() => formatBs(this.session.totalCents()));
  protected readonly qrUrl = computed(() => this.session.event()?.paymentQrUrl ?? null);
  protected readonly file = this.session.proofFile;
  /** Sin cupo para otro comprobante (salvo que este intento ya tenga uno subido). */
  protected readonly proofLimitReached = computed(
    () => (this.proofsUsed() ?? 0) >= MAX_PROOFS_PER_EVENT && !this.checkout()?.hasUploadedProof,
  );
  protected readonly canConfirm = computed(
    () =>
      !this.submitting() &&
      !!this.file() &&
      !this.proofError() &&
      !this.proofLimitReached() &&
      this.session.lines().length > 0 &&
      this.session.access() === 'can-buy',
  );

  constructor() {
    const destroyRef = inject(DestroyRef);
    this.ref.disableClose = true;
    this.ref
      .keydownEvents()
      .pipe(takeUntilDestroyed())
      .subscribe((event) => {
        if (event.key === 'Escape') this.close();
      });
    this.ref
      .backdropClick()
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.close());
    destroyRef.onDestroy(() => this.revokePreview());
    const current = this.file();
    if (current) this.setPreview(current);
    if (this.step() === 'pay') void this.loadProofCount();
  }

  /** Evita perder una compra a medio enviar al recargar o cerrar la pestaña. */
  @HostListener('window:beforeunload', ['$event'])
  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.submitting()) event.preventDefault();
  }

  protected close(): void {
    if (this.submitting()) return;
    this.ref.close(this.createdOrderId() ?? undefined);
  }

  protected goToPay(): void {
    this.error.set(null);
    this.step.set('pay');
    void this.loadProofCount();
  }

  protected backToCart(): void {
    if (this.submitting()) return;
    this.error.set(null);
    this.step.set('cart');
  }

  protected onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0) ?? null;
    input.value = '';
    if (!file) return;
    this.error.set(null);
    const invalid = validateProofFile(file);
    this.proofError.set(invalid?.message ?? null);
    this.file.set(invalid ? null : file);
    if (invalid) this.revokePreview();
    else this.setPreview(file);
  }

  protected async confirm(): Promise<void> {
    const checkout = this.checkout();
    if (!checkout || !this.canConfirm()) return;
    this.error.set(null);
    const total = this.session.totalCents();
    try {
      const orderId = await checkout.submit(this.file(), toOrderItems(this.session.lines()));
      this.createdTotal.set(total);
      this.createdOrderId.set(orderId);
      this.session.completePurchase();
      this.revokePreview();
      this.step.set('done');
    } catch (e) {
      this.handleError(e instanceof StoreError ? e : toStoreError(e));
    }
  }

  private handleError(err: StoreError): void {
    this.error.set(err.message);
    switch (err.kind) {
      case 'product-unavailable':
      case 'cart':
        this.session.productsRes.reload();
        this.step.set('cart');
        break;
      case 'pending-limit':
        this.session.ordersRes.reload();
        break;
      case 'not-registered':
        this.session.registrationRes.reload();
        break;
      case 'event-unavailable':
      case 'store-disabled':
        this.session.eventRes.reload();
        break;
      case 'proof-rejected':
        void this.loadProofCount();
        break;
    }
  }

  private async loadProofCount(): Promise<void> {
    const userId = this.auth.user()?.id;
    const eventId = this.session.event()?.id;
    if (!userId || !eventId) return;
    try {
      this.proofsUsed.set(await this.store.countMyProofs(userId, eventId));
    } catch {
      // Sin el conteo seguimos: el servidor aplica el límite igualmente.
      this.proofsUsed.set(null);
    }
  }

  private setPreview(file: File): void {
    this.revokePreview();
    this.previewUrl.set(URL.createObjectURL(file));
  }

  private revokePreview(): void {
    const url = this.previewUrl();
    if (url) URL.revokeObjectURL(url);
    this.previewUrl.set(null);
  }
}
