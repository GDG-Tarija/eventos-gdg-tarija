import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { Sponsor } from '../../../../../core/models/sponsor.model';

@Component({
  selector: 'app-sponsor-detail-modal',
  imports: [
    DatePipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatChipsModule,
  ],
  templateUrl: './sponsor-detail-modal.html',
  styleUrl: './sponsor-detail-modal.scss',
})
export class SponsorDetailModal {
  private dialogRef = inject(MatDialogRef<SponsorDetailModal>);
  readonly sponsor: Sponsor = inject(MAT_DIALOG_DATA);

  onClose(): void {
    this.dialogRef.close();
  }

  onPrint(): void {
    window.print();
  }
}
