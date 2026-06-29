import { HttpHandlerFn, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { tap } from 'rxjs';

const HEADER_NAME = 'X-XSRF-TOKEN';
let csrfToken: string | null = null;

export const csrfInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  let outReq = req;
  if (csrfToken && !isSafeMethod(req.method)) {
    outReq = req.clone({ setHeaders: { [HEADER_NAME]: csrfToken } });
  }

  return next(outReq).pipe(
    tap(event => {
      if (event instanceof HttpResponse) {
        const token = event.headers.get(HEADER_NAME);
        if (token) {
          csrfToken = token;
        }
      }
    }),
  );
};

function isSafeMethod(method: string): boolean {
  return ['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method.toUpperCase());
}
