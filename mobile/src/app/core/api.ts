import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

export const TOKEN_KEY = 'foro-amigos.token';

/** Convierte una ruta relativa del backend (/uploads/...) en URL absoluta. */
export function mediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  return path.startsWith('http') ? path : `${environment.apiUrl}${path}`;
}

export function apiUrl(path: string): string {
  return `${environment.apiUrl}/api${path}`;
}

/** Adjunta el JWT guardado a toda peticion dirigida al backend. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token || !req.url.startsWith(environment.apiUrl)) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
