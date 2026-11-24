import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  signal,
  viewChild,
} from '@angular/core';

import { StoreImage } from '../data/store.model';

/**
 * Galería deslizable (scroll-snap) con flechas, contador y teclado. Funciona con el dedo en
 * móvil y con flechas/teclado en escritorio; la primera imagen es la portada.
 */
@Component({
  selector: 'app-product-gallery',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="gallery" [attr.data-variant]="variant()">
      @if (images().length) {
        <div
          #track
          class="track"
          tabindex="0"
          role="group"
          aria-roledescription="carrusel"
          [attr.aria-label]="
            images().length > 1
              ? 'Imágenes de ' + name() + '. Usa las flechas para cambiar de imagen.'
              : 'Imagen de ' + name()
          "
          (scroll)="onScroll()"
          (keydown)="onKeydown($event)"
        >
          @for (image of images(); track image.id; let i = $index) {
            <div
              class="slide"
              role="group"
              aria-roledescription="imagen"
              [attr.aria-label]="i + 1 + ' de ' + images().length"
            >
              @if (!broken().has(image.id)) {
                <img
                  [src]="image.url"
                  [alt]="image.alt"
                  [attr.loading]="i === 0 ? 'eager' : 'lazy'"
                  decoding="async"
                  (error)="markBroken(image.id)"
                />
              } @else {
                <div class="placeholder">
                  <span class="material-symbols-rounded" aria-hidden="true">hide_image</span>
                  <span class="sr-only">{{ image.alt }} (imagen no disponible)</span>
                </div>
              }
            </div>
          }
        </div>
        @if (images().length > 1) {
          <button
            type="button"
            class="nav prev"
            aria-label="Imagen anterior"
            [disabled]="index() === 0"
            (click)="go(index() - 1)"
          >
            <span class="material-symbols-rounded" aria-hidden="true">chevron_left</span>
          </button>
          <button
            type="button"
            class="nav next"
            aria-label="Imagen siguiente"
            [disabled]="index() === images().length - 1"
            (click)="go(index() + 1)"
          >
            <span class="material-symbols-rounded" aria-hidden="true">chevron_right</span>
          </button>
          <div class="dots" aria-hidden="true">
            @for (image of images(); track image.id; let i = $index) {
              <span class="dot" [class.active]="i === index()"></span>
            }
          </div>
          <p class="counter" aria-live="polite">
            <span class="sr-only">Imagen </span>{{ index() + 1 }}<span aria-hidden="true">/</span
            ><span class="sr-only"> de </span>{{ images().length }}
          </p>
        }
      } @else {
        <div class="placeholder">
          <span class="material-symbols-rounded" aria-hidden="true">storefront</span>
          <span class="sr-only">{{ name() }} sin imagen</span>
        </div>
      }
    </div>
  `,
  styleUrl: './product-gallery.scss',
})
export class ProductGallery {
  readonly images = input.required<StoreImage[]>();
  readonly name = input.required<string>();
  /** card: portada cuadrada recortada; detail: imagen completa sobre fondo neutro. */
  readonly variant = input<'card' | 'detail'>('card');

  private readonly track = viewChild<ElementRef<HTMLElement>>('track');
  readonly index = signal(0);
  readonly broken = signal<ReadonlySet<string>>(new Set());
  readonly count = computed(() => this.images().length);

  onScroll(): void {
    const el = this.track()?.nativeElement;
    if (!el || !el.clientWidth) return;
    this.index.set(Math.min(this.count() - 1, Math.round(el.scrollLeft / el.clientWidth)));
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight') this.go(this.index() + 1);
    else if (event.key === 'ArrowLeft') this.go(this.index() - 1);
    else if (event.key === 'Home') this.go(0);
    else if (event.key === 'End') this.go(this.count() - 1);
    else return;
    event.preventDefault();
  }

  go(target: number): void {
    const next = Math.max(0, Math.min(this.count() - 1, target));
    this.index.set(next);
    const el = this.track()?.nativeElement;
    if (!el) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    el.scrollTo({ left: next * el.clientWidth, behavior: reduced ? 'auto' : 'smooth' });
  }

  markBroken(id: string): void {
    this.broken.update((set) => new Set(set).add(id));
  }
}
