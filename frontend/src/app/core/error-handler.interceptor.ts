import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from './toast.service';

export const errorHandlerInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'An unexpected error occurred. Please try again.';

      if (error.status === 0) {
        message = 'Network error — please check your connection.';
      } else if (error.status === 400) {
        const body = error.error;
        message = typeof body?.message === 'string'
          ? body.message
          : 'Invalid data. Please check your input.';
      } else if (error.status === 403) {
        message = 'This action is not allowed.';
      } else if (error.status === 404) {
        message = 'The requested record was not found.';
      } else if (error.status === 409) {
        message = 'A record with this value already exists.';
      } else if (error.status >= 500) {
        message = 'Server error. Please try again later.';
      }

      toast.show(message, 'error');
      return throwError(() => error);
    }),
  );
};
