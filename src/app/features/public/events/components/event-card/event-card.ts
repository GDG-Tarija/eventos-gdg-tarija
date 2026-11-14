import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Event } from '../../data/event.model';
import { formatEventDate, isPast, relativeLabel } from '../../data/event-timing';

const DEFAULT_THUMB =
  'https://res.cloudinary.com/dopkch3x9/image/upload/v1779579233/GDG_Bevy_DefaultEventThumbnail_2_vaeskpB_pggj5h.webp';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <article
      class="gdg-card relative overflow-hidden flex gap-4 transition-transform duration-200 ease-out-strong motion-safe:hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-google-blue-dark"
      [class.items-center]="compact()"
      [class.p-3]="compact()"
      [class.flex-col]="!compact()"
      [class.sm:flex-row]="!compact()"
      [class.sm:items-center]="!compact()"
      [class.sm:gap-6]="!compact()"
      [class.p-4]="!compact()"
      [class.sm:p-5]="!compact()"
    >
      <img
        [src]="event().image_url || DEFAULT_THUMB"
        alt=""
        loading="lazy"
        decoding="async"
        [attr.width]="compact() ? 56 : 160"
        [attr.height]="compact() ? 56 : 160"
        class="shrink-0 rounded-full object-cover bg-black/5"
        [class.size-14]="compact()"
        [class.size-40]="!compact()"
        [class.mx-auto]="!compact()"
        [class.sm:mx-0]="!compact()"
      />

      <div class="flex flex-col gap-2.5 flex-1 min-w-0">
        <h3
          class="m-0 font-bold leading-tight text-text-primary break-words font-google"
          [class.text-base]="compact()"
          [class.text-xl]="!compact()"
          [class.sm:text-2xl]="!compact()"
        >
          <a
            [routerLink]="['/e', event().slug]"
            class="text-inherit no-underline focus:outline-none after:absolute after:inset-0 after:content-['']"
            >{{ event().title }}</a
          >
        </h3>

        <div class="flex flex-wrap items-center gap-2 text-xs font-medium">
          <span
            class="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            [class.bg-google-blue/10]="!compact()"
            [class.text-google-blue-dark]="!compact()"
            [class.bg-black/5]="compact()"
            [class.text-text-secondary]="compact()"
          >
            <span class="material-symbols-rounded text-sm" aria-hidden="true">calendar_month</span>
            {{ dateLabel() }}
          </span>

          @if (compact()) {
            <span class="px-2.5 py-1 rounded-full bg-black/5 text-text-secondary">Finalizado</span>
          } @else {
            @if (relative(); as label) {
              <span
                class="px-2.5 py-1 rounded-full font-semibold"
                [class.bg-google-blue-dark]="label === 'En curso'"
                [class.text-white]="label === 'En curso'"
                [class.bg-black/5]="label !== 'En curso'"
                [class.text-text-primary]="label !== 'En curso'"
                >{{ label }}</span
              >
            }
            @if (event().location_type !== 'PHYSICAL') {
              <span
                class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/5 text-text-secondary"
              >
                <span class="material-symbols-rounded text-sm text-google-blue-dark" aria-hidden="true">{{
                  locationIcon()
                }}</span>
                {{ locationText() }}
              </span>
            }
            @if (showLocationName()) {
              <span
                class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/5 text-text-secondary min-w-0"
              >
                <span class="material-symbols-rounded text-sm shrink-0" aria-hidden="true">location_on</span>
                <span class="truncate max-w-[200px]">{{ event().location_name }}</span>
              </span>
            }
            <span class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/5 text-text-secondary">
              <span class="material-symbols-rounded text-sm" aria-hidden="true">group</span>
              {{ event().capacity }} cupos
            </span>
          }
        </div>

        @if (!compact()) {
          @if (event().description) {
            <p class="m-0 text-sm text-text-secondary leading-relaxed line-clamp-2 max-w-prose">
              {{ event().description }}
            </p>
          }
          <div class="flex sm:justify-end">
            <span
              aria-hidden="true"
              class="inline-flex items-center justify-center gap-1.5 h-10 w-full sm:w-auto px-5 rounded-full bg-google-blue-dark text-white text-sm font-bold"
            >
              Inscríbete
              <span class="material-symbols-rounded text-base">arrow_forward</span>
            </span>
          </div>
        }
      </div>
    </article>
  `,
})
export class EventCard {
  readonly event = input.required<Event>();
  readonly compact = input(false);

  readonly DEFAULT_THUMB = DEFAULT_THUMB;

  readonly dateLabel = computed(() =>
    formatEventDate(this.event(), isPast(this.event()) ? 'past' : 'upcoming'),
  );
  readonly relative = computed(() => relativeLabel(this.event()));

  readonly locationText = computed(() =>
    this.event().location_type === 'VIRTUAL' ? 'Virtual' : 'Híbrido',
  );
  readonly locationIcon = computed(() =>
    this.event().location_type === 'VIRTUAL' ? 'videocam' : 'devices',
  );

  // "Online" next to a Virtual chip is redundant.
  readonly showLocationName = computed(() => {
    const e = this.event();
    return !!e.location_name && !(e.location_type === 'VIRTUAL' && /^(online|virtual)$/i.test(e.location_name.trim()));
  });
}
