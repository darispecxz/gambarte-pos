import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;

  if (token && !req.url.includes('/auth/refresh')) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.includes('/auth/login') && !req.url.includes('/auth/refresh')) {
        try {
          return auth.refreshSession().pipe(
            switchMap(session => next(req.clone({ setHeaders: { Authorization: `Bearer ${session.token}` } }))),
            catchError(refreshError => {
              auth.logout();
              return throwError(() => refreshError);
            }),
          );
        } catch {
          auth.logout();
        }
      }
      return throwError(() => err);
    }),
  );
};
