import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { toObservable } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormField as SignalFormField, form, maxLength, required, validate } from '@angular/forms/signals';
import { filter, firstValueFrom } from 'rxjs';

import { AuthService } from '../../../core/auth/services/auth.service';
import { RegistrationStatus } from '../../../models/registration.model';
import { googleCalendarUrl } from '../events/data/calendar-link';
import { formatEventDate } from '../events/data/event-timing';
import { TicketQr } from '../events/registration/components/ticket-qr/ticket-qr';
import { UserProfileService } from '../events/registration/data/user-profile.service';
import { isValidPhone, normalizePhone } from '../events/registration/data/phone';
import { ProfileData, ProfileRegistration, ProfileService } from './data/profile.service';

const STATUS: Record<RegistrationStatus, { label: string; icon: string; color: string }> = {
  CONFIRMED: { label: 'Confirmada', icon: 'check_circle', color: 'text-google-green' },
  PENDING: { label: 'Pago en revisión', icon: 'schedule', color: 'text-google-yellow' },
  CANCELLED: { label: 'Anulada', icon: 'cancel', color: 'text-google-red' },
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, SignalFormField, TicketQr],
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
                <p class="text-xs text-text-muted m-0">Viene de tu cuenta de Google</p>
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

            @if (data(); as d) {
              @if (d.attendedCount > 0) {
                <p class="m-0 text-sm text-text-secondary">
                  Has asistido a {{ d.attendedCount }} {{ d.attendedCount === 1 ? 'evento' : 'eventos' }} con GDG Tarija
                </p>
              }
            }
            <button type="button" class="gdg-btn-outlined min-h-11 text-sm" (click)="auth.signOut()">
              Cerrar sesión
            </button>
          </div>

          @if (loading()) {
            <div class="space-y-4" aria-busy="true" aria-label="Cargando tus inscripciones">
              @for (n of [1, 2]; track n) {
                <div class="gdg-card border border-black/5 p-5 space-y-3">
                  <div class="h-5 w-2/3 rounded bg-black/5"></div>
                  <div class="h-4 w-1/2 rounded bg-black/5"></div>
                  <div class="h-4 w-1/3 rounded bg-black/5"></div>
                </div>
              }
            </div>
          } @else if (error()) {
            <div class="gdg-card p-8 text-center space-y-4" role="alert">
              <h2 class="text-xl font-bold text-text-primary font-google m-0">No pudimos cargar tu perfil</h2>
              <p class="text-text-secondary text-sm m-0">Revisa tu conexión e inténtalo de nuevo.</p>
              <button type="button" class="gdg-btn-filled min-h-11 text-sm" (click)="load()">Reintentar</button>
            </div>
          } @else if (data(); as d) {
            @if (d.upcoming.length === 0 && d.past.length === 0) {
              <div class="gdg-card p-8 sm:p-12 text-center space-y-4">
                <h2 class="text-xl font-bold text-text-primary font-google m-0">Aún no te inscribiste a ningún evento</h2>
                <a routerLink="/" class="gdg-btn-filled inline-flex items-center min-h-11 text-sm no-underline">
                  Ver próximos eventos
                </a>
              </div>
            }

            @if (d.upcoming.length) {
              <section class="space-y-3" aria-labelledby="proximos">
                <h2 id="proximos" class="text-xl font-bold text-text-primary font-google m-0">Próximos eventos</h2>
                @for (r of d.upcoming; track r.id) {
                  <article class="gdg-card border border-black/5 p-5 space-y-3">
                    <div class="flex flex-wrap items-start justify-between gap-2">
                      <h3 class="text-lg font-bold font-google m-0 leading-snug">
                        <a [routerLink]="['/e', r.event.slug]" class="inline-flex items-center min-h-11 text-google-blue-dark no-underline hover:underline">
                          {{ r.event.title }}
                        </a>
                      </h3>
                      <span
                        class="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-3 py-1 text-xs font-bold text-text-primary"
                      >
                        <span class="material-symbols-rounded text-base" [class]="status[r.status].color" aria-hidden="true">{{
                          status[r.status].icon
                        }}</span>
                        {{ status[r.status].label }}
                      </span>
                    </div>
                    <ul class="m-0 p-0 list-none space-y-1.5 text-sm text-text-secondary">
                      <li class="flex items-center gap-2">
                        <span class="material-symbols-rounded text-base text-google-blue" aria-hidden="true">calendar_month</span>
                        {{ when(r) }}
                      </li>
                      @if (r.event.location_name) {
                        <li class="flex items-center gap-2">
                          <span class="material-symbols-rounded text-base text-google-red" aria-hidden="true">location_on</span>
                          {{ r.event.location_name }}
                        </li>
                      }
                      <li class="flex items-center gap-2">
                        <span class="material-symbols-rounded text-base text-google-yellow" aria-hidden="true">confirmation_number</span>
                        {{ r.ticketName }}
                      </li>
                    </ul>
                    @if (r.sessions.length) {
                      <div class="text-sm">
                        <p class="m-0 font-semibold text-text-primary">Tus charlas</p>
                        <ul class="m-0 mt-1 p-0 list-none space-y-0.5 text-text-secondary">
                          @for (s of r.sessions; track s.title) {
                            <li>{{ s.time }} · {{ s.title }}</li>
                          }
                        </ul>
                      </div>
                    }

                    @switch (r.status) {
                      @case ('CONFIRMED') {
                        <div class="space-y-3">
                          <button
                            type="button"
                            class="gdg-btn-ghost min-h-11 text-sm inline-flex items-center gap-2"
                            [attr.aria-expanded]="qrOpen(r)"
                            [attr.aria-controls]="'qr-' + r.id"
                            (click)="toggleQr(r)"
                          >
                            <span class="material-symbols-rounded text-base" aria-hidden="true">qr_code_2</span>
                            {{ qrOpen(r) ? 'Ocultar QR' : 'Mostrar mi QR' }}
                          </button>
                          @if (qrOpen(r)) {
                            <div [id]="'qr-' + r.id" class="flex justify-center">
                              <app-ticket-qr [registrationId]="r.id" [eventTitle]="r.event.title" />
                            </div>
                          }
                          <div class="flex flex-wrap gap-3">
                            <a
                              [href]="calendarUrl(r)"
                              target="_blank"
                              rel="noopener"
                              class="gdg-btn-outlined inline-flex items-center gap-2 min-h-11 text-sm no-underline"
                            >
                              <span class="material-symbols-rounded text-base" aria-hidden="true">event</span>
                              Agregar a Google Calendar
                            </a>
                            <a
                              [routerLink]="['/e', r.event.slug]"
                              class="inline-flex items-center min-h-11 text-sm font-semibold text-google-blue-dark no-underline hover:underline"
                              >Ver evento</a
                            >
                          </div>
                        </div>
                      }
                      @case ('PENDING') {
                        <p class="m-0 text-sm text-text-secondary">
                          Tu pago está en revisión. Cuando lo confirmemos verás aquí tu QR.
                        </p>
                      }
                      @case ('CANCELLED') {
                        <div class="space-y-2">
                          <p class="m-0 text-sm text-text-secondary">Tu inscripción fue anulada.</p>
                          <a
                            [href]="supportUrl(r)"
                            target="_blank"
                            rel="noopener"
                            class="gdg-btn-outlined inline-flex items-center gap-2 min-h-11 text-sm no-underline"
                          >
                            <span class="material-symbols-rounded text-base" aria-hidden="true">support_agent</span>
                            Escríbenos por Soporte
                          </a>
                        </div>
                      }
                    }
                  </article>
                }
              </section>
            }

            @if (d.past.length) {
              <section class="space-y-3" aria-labelledby="historial">
                <h2 id="historial" class="text-xl font-bold text-text-primary font-google m-0">Historial</h2>
                @for (r of d.past; track r.id) {
                  <article class="gdg-card border border-black/5 p-4 space-y-1">
                    <div class="min-w-0 space-y-1">
                      <h3 class="text-base font-bold text-text-primary font-google m-0 leading-snug">{{ r.event.title }}</h3>
                      <p class="m-0 text-xs text-text-secondary">{{ when(r) }}</p>
                      <p class="m-0 text-sm text-text-primary flex items-center gap-1.5">
                        @if (r.attended) {
                          <span class="material-symbols-rounded text-base text-google-green" aria-hidden="true">check_circle</span>
                          Asististe
                        } @else {
                          No registramos tu asistencia
                        }
                      </p>
                    </div>
                    @if (r.attended) {
                      <a
                        [routerLink]="['/certificados', r.id]"
                        class="inline-flex items-center min-h-11 text-sm font-semibold text-google-blue-dark no-underline hover:underline"
                        >Ver certificado</a
                      >
                    }
                  </article>
                }
                <a routerLink="/certificados" class="inline-flex items-center min-h-11 text-sm font-semibold text-google-blue-dark">
                  Ver todos mis certificados
                </a>
              </section>
            }
          }
        } @else {
          <div class="gdg-card p-8 sm:p-12 text-center space-y-4">
            <h2 class="text-xl font-bold text-text-primary font-google m-0">Inicia sesión para ver tu perfil</h2>
            <p class="text-text-secondary text-sm m-0">Aquí verás tus datos, tus inscripciones y tu asistencia.</p>
            <button type="button" class="gdg-btn-filled min-h-11 text-sm" (click)="auth.signInWithGoogle()">
              Continuar con Google
            </button>
          </div>
        }
      </div>
    </section>
  `,
})
export class Profile implements OnInit {
  readonly auth = inject(AuthService);
  private readonly profiles = inject(ProfileService);
  private readonly userProfile = inject(UserProfileService);
  private readonly title = inject(Title);

  // toObservable necesita contexto de inyección: va como campo.
  private readonly authLoading$ = toObservable(this.auth.loading);

  readonly status = STATUS;
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly data = signal<ProfileData | null>(null);

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

  /** Solo el primer evento confirmado arranca con el QR abierto; el resto lo decide quien toca el botón. */
  private readonly qrOverrides = signal<Record<string, boolean>>({});
  private readonly firstConfirmedId = computed(
    () => this.data()?.upcoming.find((r) => r.status === 'CONFIRMED')?.id ?? null,
  );

  constructor() {
    this.title.setTitle('Mi perfil | GDG Tarija');
  }

  async ngOnInit(): Promise<void> {
    await firstValueFrom(this.authLoading$.pipe(filter((l) => !l)));
    await this.load();
  }

  async load(): Promise<void> {
    const user = this.auth.user();
    if (!user) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set(false);
    try {
      this.data.set(await this.profiles.loadMine(user.id));
    } catch (e) {
      console.error('[Profile] load failed:', e);
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  when(r: ProfileRegistration): string {
    return formatEventDate(r.event, this.data()?.upcoming.includes(r) ? 'upcoming' : 'past');
  }

  calendarUrl = (r: ProfileRegistration) => googleCalendarUrl(r.event);

  supportUrl(r: ProfileRegistration): string {
    const u = this.auth.user();
    const text = `¡Hola! Soy ${u?.first_name} ${u?.last_name} (${u?.email}). Mi inscripción a "${r.event.title}" figura como anulada y necesito ayuda.`;
    return `https://wa.me/59179288990?text=${encodeURIComponent(text)}`;
  }

  qrOpen(r: ProfileRegistration): boolean {
    return this.qrOverrides()[r.id] ?? r.id === this.firstConfirmedId();
  }

  toggleQr(r: ProfileRegistration): void {
    this.qrOverrides.update((o) => ({ ...o, [r.id]: !this.qrOpen(r) }));
  }

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
