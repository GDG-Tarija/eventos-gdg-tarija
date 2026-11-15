import { Component, computed, inject, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormField as SignalFormField, form, maxLength, required, validate } from '@angular/forms/signals';

import { AuthService } from '../../../core/auth/services/auth.service';
import { UserProfileService } from '../events/registration/data/user-profile.service';
import { isValidPhone, normalizePhone } from '../events/registration/data/phone';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, SignalFormField],
  template: `
    <section class="gdg-page min-h-[calc(100vh-64px)] pb-16">
      <div class="gdg-container max-w-3xl space-y-6 pt-6">
        <h1 class="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight font-google">Mi perfil</h1>

        @if (auth.loading()) {
          <div class="flex justify-center py-16">
            <mat-progress-spinner mode="indeterminate" diameter="32" aria-label="Cargando sesión" />
          </div>
        } @else if (auth.user(); as user) {
          <!-- Tus datos -->
          <div class="gdg-card border border-black/5 p-5 sm:p-6 space-y-5">
            <div class="flex items-center gap-4">
              @if (user.avatar_url) {
                <img
                  [src]="user.avatar_url"
                  alt=""
                  referrerpolicy="no-referrer"
                  class="size-16 rounded-full object-cover border border-black/10 shrink-0"
                />
              } @else {
                <span
                  class="size-16 rounded-full bg-google-blue-light text-google-blue-dark flex items-center justify-center text-xl font-bold shrink-0"
                  aria-hidden="true"
                  >{{ initials() }}</span
                >
              }
              <div class="min-w-0">
                <h2 class="text-xl font-bold text-text-primary font-google m-0 break-words">
                  {{ user.first_name }} {{ user.last_name }}
                </h2>
                <p class="text-sm text-text-secondary m-0 break-all">{{ user.email }}</p>
              </div>
            </div>

            @if (editing()) {
              <form class="space-y-3" (submit)="$event.preventDefault(); save()">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Nombres</mat-label>
                    <input matInput [formField]="profileForm.firstName" autocomplete="given-name" />
                    @if (profileForm.firstName().invalid() && profileForm.firstName().touched()) {
                      <mat-error class="text-xs">{{ profileForm.firstName().errors()[0]?.message }}</mat-error>
                    }
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Apellidos</mat-label>
                    <input matInput [formField]="profileForm.lastName" autocomplete="family-name" />
                    @if (profileForm.lastName().invalid() && profileForm.lastName().touched()) {
                      <mat-error class="text-xs">{{ profileForm.lastName().errors()[0]?.message }}</mat-error>
                    }
                  </mat-form-field>
                  <p class="sm:col-span-2 -mt-2 m-0 text-xs text-text-secondary">
                    Así aparecerá tu nombre en tus certificados.
                  </p>
                  <mat-form-field appearance="outline" class="sm:col-span-2 w-full">
                    <mat-label>Celular</mat-label>
                    <input matInput [formField]="profileForm.phone" type="tel" inputmode="tel" autocomplete="tel" />
                    <mat-hint>Ej. 71234567</mat-hint>
                    @if (profileForm.phone().invalid() && profileForm.phone().touched()) {
                      <mat-error class="text-xs">{{ profileForm.phone().errors()[0]?.message }}</mat-error>
                    }
                  </mat-form-field>
                </div>
                @if (saveError()) {
                  <p class="text-sm text-google-red m-0" role="alert">{{ saveError() }}</p>
                }
                <div class="flex flex-wrap gap-3">
                  <button type="submit" class="gdg-btn-filled min-h-11 text-sm" [disabled]="saving()">
                    {{ saving() ? 'Guardando…' : 'Guardar' }}
                  </button>
                  <button type="button" class="gdg-btn-outlined min-h-11 text-sm" (click)="editing.set(false)">
                    Cancelar
                  </button>
                </div>
              </form>
            } @else {
              <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="m-0 text-sm text-text-primary flex items-center gap-2">
                  <span class="material-symbols-rounded text-lg text-google-green" aria-hidden="true">call</span>
                  {{ user.phone || 'Sin celular registrado' }}
                </p>
                <button type="button" class="gdg-btn-ghost min-h-11 text-sm" (click)="startEdit()">Editar</button>
              </div>
              @if (saved()) {
                <p class="text-sm text-google-green m-0" role="status">Datos actualizados</p>
              }
            }

            <button type="button" class="gdg-btn-outlined min-h-11 text-sm" (click)="auth.signOut()">
              Cerrar sesión
            </button>
          </div>
        } @else {
          <div class="gdg-card p-8 sm:p-12 text-center space-y-4">
            <h2 class="text-xl font-bold text-text-primary font-google m-0">Inicia sesión para ver tu perfil</h2>
            <button type="button" class="gdg-btn-filled min-h-11 text-sm" (click)="auth.signInWithGoogle()">
              Continuar con Google
            </button>
          </div>
        }
      </div>
    </section>
  `,
})
export class Profile {
  readonly auth = inject(AuthService);
  private readonly userProfile = inject(UserProfileService);

  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly formData = signal({ firstName: '', lastName: '', phone: '' });
  readonly profileForm = form(this.formData, (path) => {
    // required() deja pasar "   ", por eso el nombre se valida recortado.
    const name = (empty: string) => (ctx: { value: () => string }) =>
      ctx.value().trim().length < 2 ? { kind: 'required', message: empty } : undefined;
    validate(path.firstName, name('Escribe tus nombres'));
    validate(path.lastName, name('Escribe tus apellidos'));
    maxLength(path.firstName, 60, { message: 'Máximo 60 caracteres' });
    maxLength(path.lastName, 60, { message: 'Máximo 60 caracteres' });
    required(path.phone, { message: 'Ingresa tu celular' });
    validate(path.phone, (ctx) =>
      ctx.value() && !isValidPhone(ctx.value())
        ? {
            kind: 'phone',
            message: 'Ingresa un celular de 8 dígitos, ej. 71234567. Si es de otro país, empieza con + y el código.',
          }
        : undefined,
    );
  });

  readonly initials = computed(() => {
    const u = this.auth.user();
    return `${u?.first_name?.[0] ?? ''}${u?.last_name?.[0] ?? ''}`.toUpperCase() || '?';
  });

  startEdit(): void {
    const u = this.auth.user();
    if (!u) return;
    this.formData.set({ firstName: u.first_name, lastName: u.last_name, phone: u.phone ?? '' });
    this.saveError.set(null);
    this.saved.set(false);
    this.editing.set(true);
  }

  async save(): Promise<void> {
    const user = this.auth.user();
    if (!user || this.saving()) return;
    if (this.profileForm().invalid()) {
      this.profileForm().markAsTouched();
      return;
    }
    const v = this.formData();
    this.saving.set(true);
    this.saveError.set(null);
    try {
      const updated = await this.userProfile.updateProfile(user.id, {
        first_name: v.firstName.trim(),
        last_name: v.lastName.trim(),
        phone: normalizePhone(v.phone),
      });
      this.auth.user.set({ ...user, ...updated });
      this.editing.set(false);
      this.saved.set(true);
    } catch (e) {
      console.error('[Profile] save failed:', e);
      this.saveError.set('No pudimos guardar tus datos. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      this.saving.set(false);
    }
  }
}
