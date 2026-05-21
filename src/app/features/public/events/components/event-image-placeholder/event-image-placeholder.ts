import { Component, input } from '@angular/core';

@Component({
  selector: 'app-event-image-placeholder',
  standalone: true,
  template: `
    <div
      class="aspect-video rounded-2xl flex items-center justify-center overflow-hidden"
      [class]="containerClass()"
    >
      <div class="grid grid-cols-2 grid-rows-2 w-full h-full">
        <div class="bg-google-blue/20"></div>
        <div class="bg-google-red/20"></div>
        <div class="bg-google-yellow/20"></div>
        <div class="bg-google-green/20"></div>
      </div>
    </div>
  `,
})
export class EventImagePlaceholder {
  readonly containerClass = input('bg-surface-main');
}
