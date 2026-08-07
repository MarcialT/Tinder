import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Protege las rutas internas: si no hay sesion valida, manda al login. */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;
  if (await auth.restoreSession()) return true;
  return router.createUrlTree(['/login']);
};

/** Evita volver al login/registro cuando ya hay sesion abierta. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn() || (await auth.restoreSession())) {
    return router.createUrlTree(['/tabs/descubrir']);
  }
  return true;
};
