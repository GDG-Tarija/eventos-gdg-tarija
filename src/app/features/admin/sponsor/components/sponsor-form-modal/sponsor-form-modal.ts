import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DialogFrame } from '../../../../../shared/components/dialog-frame/dialog-frame';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Sponsor } from '../../../../../core/models/sponsor.model';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

export interface SponsorFormData {
  sponsor?: Sponsor;
}

@Component({
  selector: 'app-sponsor-form-modal',
  imports: [
    ReactiveFormsModule,
    DialogFrame,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
  ],
  templateUrl: './sponsor-form-modal.html',
  styleUrl: './sponsor-form-modal.scss',
})
export class SponsorFormModal implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<SponsorFormModal>);
  private data: SponsorFormData = inject(MAT_DIALOG_DATA);

  readonly scoreOptions = ['A+', 'A', 'B+', 'B', 'C'];

  get isEditMode(): boolean {
    return !!this.data?.sponsor;
  }

  form = this.fb.group({
    name: [null as string | null, [Validators.maxLength(100)]],
    description: [null as string | null, [Validators.maxLength(500)]],
    score: [null as string | null],
    active: [true],
  });

  ngOnInit(): void {
    if (this.data?.sponsor) {
      this.form.patchValue({
        name: this.data.sponsor.name,
        description: this.data.sponsor.description,
        score: this.data.sponsor.score,
        active: this.data.sponsor.state === 'ACTIVE',
      });
    }
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.value;
    this.dialogRef.close({
      name: raw.name || null,
      description: raw.description || null,
      score: raw.score || null,
      state: raw.active ? 'ACTIVE' : 'INACTIVE',
    });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  getFieldError(field: string): string {
    const control = this.form.get(field);
    if (!control?.errors || !control.touched) return '';
    if (control.errors['maxlength']) return `Máximo ${control.errors['maxlength'].requiredLength} caracteres`;
    return 'Campo inválido';
  }
}
