import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Sponsor } from '../../../../../core/models/sponsor.model';

@Component({
  selector: 'app-sponsor-delete-confirm-modal',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './sponsor-delete-confirm-modal.html',
  styleUrl: './sponsor-delete-confirm-modal.scss',
})
export class SponsorDeleteConfirmModal {
  private dialogRef = inject(MatDialogRef<SponsorDeleteConfirmModal>);
  readonly sponsor: Sponsor = inject(MAT_DIALOG_DATA);

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
