import { Component } from '@angular/core';

@Component({
  selector: 'app-event-card-skeleton',
  standalone: true,
  template: `
    <div
      class="gdg-card overflow-hidden animate-pulse p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6"
    >
      <div class="size-40 shrink-0 rounded-full bg-black/5 mx-auto sm:mx-0"></div>
      <div class="flex flex-col gap-2.5 flex-1 min-w-0">
        <div class="h-7 w-3/4 rounded-2xl bg-black/10"></div>
        <div class="flex flex-wrap gap-2">
          <div class="h-6 w-32 rounded-full bg-black/5"></div>
          <div class="h-6 w-16 rounded-full bg-black/5"></div>
          <div class="h-6 w-20 rounded-full bg-black/5"></div>
        </div>
        <div class="space-y-1.5">
          <div class="h-3.5 w-full rounded-full bg-black/5"></div>
          <div class="h-3.5 w-5/6 rounded-full bg-black/5"></div>
        </div>
        <div class="h-10 w-full sm:w-32 sm:self-end rounded-full bg-black/5"></div>
      </div>
    </div>
  `,
})
export class EventCardSkeleton {}
