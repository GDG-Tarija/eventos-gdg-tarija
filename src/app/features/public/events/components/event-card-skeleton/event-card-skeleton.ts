import { Component } from '@angular/core';

@Component({
  selector: 'app-event-card-skeleton',
  standalone: true,
  template: `
    <div class="gdg-card overflow-hidden animate-pulse p-3 sm:p-5 sm:h-[230px]">
      <div class="flex flex-col sm:flex-row gap-4 sm:gap-6 h-full sm:items-center">
        <div
          class="w-full aspect-square max-w-[280px] sm:w-[210px] sm:h-full shrink-0 rounded-full bg-black/5 mx-auto sm:mx-0"
        ></div>
        <div class="flex flex-col justify-between gap-2.5 flex-1 min-w-0 h-full">
          <!-- Bloque Superior: Título, Metadata y Descripción -->
          <div class="space-y-2">
            <!-- Título del Evento -->
            <div class="h-6 sm:h-8 w-3/4 rounded-2xl bg-black/10"></div>

            <!-- Metadata Chips -->
            <div class="flex flex-wrap gap-2 text-xs">
              <div class="h-6 w-24 rounded-full bg-black/5 shrink-0"></div>
              <div class="h-6 w-20 rounded-full bg-black/5 shrink-0"></div>
              <div class="h-6 w-28 rounded-full bg-black/5 shrink-0"></div>
            </div>

            <!-- Descripción -->
            <div class="space-y-1.5">
              <div class="h-3.5 w-full rounded-full bg-black/5"></div>
              <div class="h-3.5 w-5/6 rounded-full bg-black/5"></div>
            </div>
          </div>

          <!-- Bloque Inferior: Barra de Estado y Acción -->
          <div
            class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full border-t border-black/5 pt-2.5 mt-0.5 shrink-0"
          >
            <!-- Alerta discreta de carga -->
            <div class="h-5 w-24 rounded bg-black/5"></div>

            <!-- Acción -->
            <div class="w-full sm:w-auto">
              <div class="h-8 w-full sm:w-24 rounded-full bg-black/5"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class EventCardSkeleton {}
