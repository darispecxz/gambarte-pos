import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.isLoggedIn) return true;
  return inject(Router).createUrlTree(['/login']);
};

export function roleGuard(...allowed: number[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const rol = auth.rol?.id_rol ?? 0;
    if (allowed.includes(rol)) return true;
    const rolDesc = auth.rol?.descripcion ?? 'desconocido';
    auth.logout();
    sessionStorage.setItem('pos_login_error', `Su rol (${rolDesc}) no tiene acceso al sistema POS.`);
    return inject(Router).createUrlTree(['/login']);
  };
}
