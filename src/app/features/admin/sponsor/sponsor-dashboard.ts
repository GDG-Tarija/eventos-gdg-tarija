import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { toSignal } from '@angular/core/rxjs-interop';
import { Sponsor } from '../../../core/models/sponsor.model';
import { SPSponsor } from '../../../core/services/supabase/sb-sponsor';
import { SponsorTable } from './components/sponsor-table/sponsor-table';
import { SponsorFormModal, SponsorFormData } from './components/sponsor-form-modal/sponsor-form-modal';
import { SponsorDetailModal } from './components/sponsor-detail-modal/sponsor-detail-modal';
import { SponsorDeleteConfirmModal } from './components/sponsor-delete-confirm-modal/sponsor-delete-confirm-modal';

@Component({
  selector: 'app-sponsor-dashboard',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    SponsorTable,
  ],
  templateUrl: './sponsor-dashboard.html',
  styleUrl: './sponsor-dashboard.scss',
})
export class SponsorDashboard {
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private service = inject(SPSponsor);

  readonly sponsors = toSignal(this.service.listen(), { initialValue: [] });
  readonly searchTerm = signal('');

  readonly filteredSponsors = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.sponsors();
    return this.sponsors().filter(
      (s) =>
        (s.name ?? '').toLowerCase().includes(term) ||
        (s.description ?? '').toLowerCase().includes(term) ||
        (s.score ?? '').toLowerCase().includes(term),
    );
  });

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  openCreateModal(): void {
    const ref = this.dialog.open(SponsorFormModal, {
      hasBackdrop: false,
      panelClass: 'floating-dialog-panel',
      data: {} satisfies SponsorFormData,
    });

    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      const newSponsor: Sponsor = {
        ...result,
        id: crypto.randomUUID(),
        state: result.state ?? 'ACTIVE',
      };

      this.service.add(newSponsor).subscribe(() => {
        this.snackBar.open('Patrocinador registrado correctamente', 'Cerrar', { duration: 3000 });
      });
    });
  }

  onEdit(sponsor: Sponsor): void {
    const ref = this.dialog.open(SponsorFormModal, {
      hasBackdrop: false,
      panelClass: 'floating-dialog-panel',
      data: { sponsor } satisfies SponsorFormData,
    });

    ref.afterClosed().subscribe((result) => {
      if (!result) return;

      this.service.update({ ...result, id: sponsor.id }).subscribe(() => {
        this.snackBar.open('Patrocinador actualizado correctamente', 'Cerrar', { duration: 3000 });
      });
    });
  }

  onView(sponsor: Sponsor): void {
    this.dialog.open(SponsorDetailModal, {
      width: '38rem',
      maxWidth: '95vw',
      data: sponsor,
    });
  }

  onDelete(sponsor: Sponsor): void {
    const ref = this.dialog.open(SponsorDeleteConfirmModal, {
      width: '28rem',
      maxWidth: '95vw',
      data: sponsor,
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.service.delete(sponsor.id).subscribe(() => {
        this.snackBar.open('Patrocinador eliminado', 'Cerrar', { duration: 3000 });
      });
    });
  }
}
