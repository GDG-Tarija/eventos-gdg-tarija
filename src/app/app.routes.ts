import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Dashboard } from './features/dashboard/dashboard';
import { AdminLayout } from './layouts/admin-layout/admin-layout';
import { AuthLayout } from './layouts/auth-layout/auth-layout';

export const routes: Routes = [
  {
    path: 'auth',
    component: AuthLayout,
    children: [
      { path: 'login', component: Login }
    ]
  },
  {
    path: 'dashboard',
    component: AdminLayout,
    //canActivate: [authGuard]
    children: [
      { path: '', component: Dashboard },
      {
        path: 'admin/sponsor',
        loadComponent: () => import('./features/admin/sponsor/sponsor-dashboard').then(m => m.SponsorDashboard),
      },
    ]
  },
  { path: '**', redirectTo: 'auth/login' }
];
