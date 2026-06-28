import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts/public-layout/public-layout').then(m => m.PublicLayout),
    children: [
      { path: '', loadComponent: () => import('./features/public/home/home').then(m => m.Home) },
      { path: 'auth/login', loadComponent: () => import('./features/auth/login/login').then(m => m.Login) },
      { path: 'e/:slug', loadComponent: () => import('./features/public/events/detail/event-detail').then(m => m.EventDetail) },
      { path: 'certificados', loadComponent: () => import('./features/public/certificates/certificates-list/certificates-list').then(m => m.CertificatesList) },
      { path: 'certificados/:id', loadComponent: () => import('./features/public/certificates/certificate-detail/certificate-detail').then(m => m.CertificateDetail) },
    ],
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./features/auth/callback/callback').then(m => m.Callback),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./layouts/admin-layout/admin-layout').then(m => m.AdminLayout),
    //canActivate: [authGuard],
    children: [
      { path: '', loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard) },
      {
        path: 'admin/sponsor',
        loadComponent: () => import('./features/admin/sponsor/sponsor-dashboard').then(m => m.SponsorDashboard),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
