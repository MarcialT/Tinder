import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonContent, IonInput, IonButton, IonIcon, IonSpinner,
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss', '../shared/auth-shell.scss'],
  imports: [FormsModule, RouterLink, IonContent, IonInput, IonButton, IonIcon, IonSpinner],
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  showPassword = signal(false);
  loading = signal(false);
  error = signal('');

  async submit(): Promise<void> {
    if (this.loading()) return;
    this.error.set('');

    if (!this.email.trim() || !this.password) {
      this.error.set('Escribe tu correo y tu contraseña');
      return;
    }

    this.loading.set(true);
    try {
      await this.auth.login(this.email.trim(), this.password);
      await this.router.navigateByUrl('/tabs/descubrir', { replaceUrl: true });
    } catch (err: unknown) {
      this.error.set(readError(err, 'No pudimos iniciar sesion'));
    } finally {
      this.loading.set(false);
    }
  }
}

export function readError(err: unknown, fallback: string): string {
  const detail = (err as { error?: { error?: string } })?.error?.error;
  if (detail) return detail;
  if ((err as { status?: number })?.status === 0) {
    return 'No hay conexion con el servidor. Revisa que el backend este corriendo.';
  }
  return fallback;
}
