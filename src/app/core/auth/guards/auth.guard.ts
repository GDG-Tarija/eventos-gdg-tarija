import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const session = await auth.getSession();
  if (session) return true;
  return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: route.data['loginReturnUrl'] } });
};
