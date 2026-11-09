import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface MissingFieldsDialogData {
  /** Mensajes ya redactados para el usuario, uno por campo o requisito faltante. */
  messages: string[];
}

@Component({
  selector: 'app-missing-fields-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title class="flex items-center gap-2 !text-base font-bold">
      <span class="material-symbols-rounded text-google-red" aria-hidden="true">error</span>
      @if (data.messages.length === 1) {
        Te falta completar 1 dato
      } @else {
        Te faltan completar {{ data.messages.length }} datos
      }
    </h2>
    <mat-dialog-content>
      <ul class="m-0 space-y-1.5 pl-5 text-sm text-text-secondary">
        @for (message of data.messages; track message) {
          <li>{{ message }}</li>
        }
      </ul>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button type="button" class="gdg-btn-filled" mat-dialog-close cdkFocusInitial>
        Entendido
      </button>
    </mat-dialog-actions>
  `,
})
export class MissingFieldsDialog {
  readonly data = inject<MissingFieldsDialogData>(MAT_DIALOG_DATA);
}
