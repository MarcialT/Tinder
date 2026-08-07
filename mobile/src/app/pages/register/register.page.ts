import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonContent, IonInput, IonButton, IonIcon, IonSpinner, IonSelect, IonSelectOption, IonTextarea,
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/auth.service';
import { readError } from '../login/login.page';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss', '../shared/auth-shell.scss'],
  imports: [
    FormsModule, RouterLink, IonContent, IonInput, IonButton, IonIcon, IonSpinner,
    IonSelect, IonSelectOption, IonTextarea,
  ],
})
export class RegisterPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  form = {
    name: '',
    email: '',
    password: '',
    birthdate: '',
    gender: 'mujer',
    interestedIn: 'todos',
    city: '',
    bio: '',
    interests: '',
  };

  photo: File | null = null;
  preview = signal<string>('');
  loading = signal(false);
  error = signal('');

  /** Toma la imagen elegida en el <input type="file"> y muestra una vista previa. */
  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.photo = file;
    const reader = new FileReader();
    reader.onload = () => this.preview.set(String(reader.result));
    reader.readAsDataURL(file);
  }

  async submit(): Promise<void> {
    if (this.loading()) return;
    this.error.set('');

    if (!this.form.name.trim() || !this.form.email.trim() || !this.form.password) {
      this.error.set('Nombre, correo y contrasena son obligatorios');
      return;
    }
    if (this.form.password.length < 6) {
      this.error.set('La contrasena debe tener al menos 6 caracteres');
      return;
    }

    this.loading.set(true);
    try {
      await this.auth.register({ ...this.form }, this.photo);
      await this.router.navigateByUrl('/tabs/descubrir', { replaceUrl: true });
    } catch (err: unknown) {
      this.error.set(readError(err, 'No pudimos crear tu cuenta'));
    } finally {
      this.loading.set(false);
    }
  }
}
