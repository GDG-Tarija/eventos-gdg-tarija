import { Component } from '@angular/core';

@Component({
  selector: 'app-event-card-skeleton',
  standalone: true,
  template: `
    <div class="gdg-card overflow-hidden animate-pulse p-5 sm:h-[240px]">
      <div class="flex flex-col sm:flex-row sm:items-center gap-5 h-full">
        <div class="w-32 h-32 sm:w-36 sm:h-36 shrink-0 mx-auto sm:mx-0">
          <div class="w-full h-full bg-black/5 rounded-full"></div>
        </div>
        <div class="flex flex-col justify-between gap-3 flex-1 min-w-0 h-full">
          <div class="space-y-3">
            <div class="flex flex-wrap gap-2 justify-center sm:justify-start">
              <div class="h-6 w-28 rounded-full bg-black/5"></div>
              <div class="h-6 w-24 rounded-full bg-black/5"></div>
            </div>
            <div class="h-8 w-3/4 rounded-2xl bg-black/10 pt-1 mx-auto sm:mx-0"></div>
            <div class="h-4 w-full rounded-full bg-black/5"></div>
            <div class="h-4 w-5/6 rounded-full bg-black/5"></div>
          </div>
          <div class="sm:self-end sm:w-56 w-full mt-2 sm:mt-0">
            <div class="h-11 w-full rounded-full bg-black/5"></div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class EventCardSkeleton {}
