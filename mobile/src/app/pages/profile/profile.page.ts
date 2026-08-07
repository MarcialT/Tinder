import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonIcon, IonButton, IonInput, IonTextarea,
  IonSelect, IonSelectOption, IonList, IonItem, IonLabel, IonSpinner,
  AlertController, ToastController, ViewWillEnter,
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/auth.service';
import { SocketService } from '../../core/socket.service';
import { mediaUrl } from '../../core/api';
import { readError } from '../login/login.page';
import { InterestsPickerComponent } from '../../shared/interests-picker/interests-picker.component';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [
    FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, IonIcon, IonButton, IonInput,
    IonTextarea, IonSelect, IonSelectOption, IonList, IonItem, IonLabel, IonSpinner,
    InterestsPickerComponent,
  ],
})
export class ProfilePage implements ViewWillEnter {
  private auth = inject(AuthService);
  private socket = inject(SocketService);
  private alerts = inject(AlertController);
  private toast = inject(ToastController);

  @ViewChild('photoInput') photoInput?: ElementRef<HTMLInputElement>;

  readonly mediaUrl = mediaUrl;
  readonly user = this.auth.user;
  readonly online = this.socket.connected;

  form = { name: '', birthdate: '', gender: '', interestedIn: 'todos', city: '', bio: '' };
  interests: string[] = [];
  saving = signal(false);

  ionViewWillEnter(): void {
    const u = this.user();
    if (!u) return;
    this.form = {
      name: u.name,
      birthdate: u.birthdate ?? '',
      gender: u.gender ?? '',
      interestedIn: u.interestedIn ?? 'todos',
      city: u.city ?? '',
      bio: u.bio ?? '',
    };
    this.interests = (u.interests ?? '').split(',').map((i) => i.trim()).filter(Boolean);
  }

  async save(): Promise<void> {
    if (!this.form.name.trim()) return this.notify('El nombre no puede quedar vacio', 'danger');

    this.saving.set(true);
    try {
      await this.auth.updateProfile({ ...this.form, interests: this.interests.join(', ') });
      await this.notify('Perfil actualizado', 'success');
    } catch (err) {
      await this.notify(readError(err, 'No se pudo guardar'), 'danger');
    } finally {
      this.saving.set(false);
    }
  }

  changePhoto(): void {
    this.photoInput?.nativeElement.click();
  }

  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.saving.set(true);
    try {
      await this.auth.updatePhoto(file);
      await this.notify('Foto actualizada', 'success');
    } catch (err) {
      await this.notify(readError(err, 'No se pudo subir la foto'), 'danger');
    } finally {
      this.saving.set(false);
    }
  }

  async changePassword(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Cambiar contraseña',
      inputs: [
        { name: 'current', type: 'password', placeholder: 'Contraseña actual' },
        { name: 'next', type: 'password', placeholder: 'Nueva contraseña (min. 6)' },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async (data: { current: string; next: string }) => {
            try {
              await this.auth.changePassword(data.current, data.next);
              await this.notify('Contraseña actualizada', 'success');
            } catch (err) {
              await this.notify(readError(err, 'No se pudo cambiar'), 'danger');
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async deleteAccount(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Eliminar cuenta',
      message: 'Se borraran tu perfil, tus amistades y todos tus mensajes. Esta accion es definitiva.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.auth.deleteAccount();
          },
        },
      ],
    });
    await alert.present();
  }

  logout(): void {
    this.auth.logout();
  }

  initials(name: string): string {
    return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  }

  private async notify(message: string, color: string): Promise<void> {
    const toast = await this.toast.create({ message, color, duration: 2200 });
    await toast.present();
  }
}
