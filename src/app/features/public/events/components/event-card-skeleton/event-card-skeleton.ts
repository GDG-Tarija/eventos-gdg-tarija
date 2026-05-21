import { Component } from '@angular/core';

@Component({
  selector: 'app-event-card-skeleton',
  standalone: true,
  template: `
    <div class="gdg-card overflow-hidden animate-pulse p-4">
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="sm:w-72 shrink-0">
          <div class="aspect-video sm:aspect-auto sm:h-full sm:min-h-44 bg-black/5 rounded-2xl"></div>
        </div>
        <div class="flex flex-col justify-between gap-3 flex-1 min-w-0">
          <div class="space-y-3">
            <div class="h-4 w-32 rounded-full bg-black/5"></div>
            <div class="h-6 w-full rounded-full bg-black/10"></div>
            <div class="h-4 w-3/4 rounded-full bg-black/5"></div>
            <div class="h-3 w-48 rounded-full bg-black/5"></div>
          </div>
          <div class="sm:self-end sm:w-56 w-full">
            <div class="h-12 w-full rounded-full bg-black/5"></div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class EventCardSkeleton {}
