import { HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';

const COOKIE_NAME = 'XSRF-TOKEN';
const HEADER_NAME = 'X-XSRF-TOKEN';

export const csrfInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  if (isSafeMethod(req.method)) {
    return next(req);
  }

  const token = readCookie(COOKIE_NAME);
  if (!token) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { [HEADER_NAME]: token } }));
};

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.$?*|{}()\[\]\\\/+^]/g, '\\$&') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function isSafeMethod(method: string): boolean {
  return ['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method.toUpperCase());
}
