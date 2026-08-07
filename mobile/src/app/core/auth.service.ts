import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthResponse, User } from './models';
import { TOKEN_KEY, apiUrl } from './api';
import { SocketService } from './socket.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private socket = inject(SocketService);

  readonly user = signal<User | null>(null);
  readonly isLoggedIn = computed(() => this.user() !== null);

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /** Revalida contra el backend el token guardado en el dispositivo. */
  async restoreSession(): Promise<boolean> {
    if (!this.token) return false;
    try {
      const res = await firstValueFrom(this.http.get<{ user: User }>(apiUrl('/auth/me')));
      this.applySession(this.token, res.user);
      return true;
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      return false;
    }
  }

  async login(email: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<AuthResponse>(apiUrl('/auth/login'), { email, password }),
    );
    this.applySession(res.token, res.user);
  }

  /** El registro viaja como multipart para incluir la foto de perfil. */
  async register(data: Record<string, string>, photo: File | null): Promise<void> {
    const form = new FormData();
    for (const [key, value] of Object.entries(data)) form.append(key, value ?? '');
    if (photo) form.append('photo', photo, photo.name);

    const res = await firstValueFrom(this.http.post<AuthResponse>(apiUrl('/auth/register'), form));
    this.applySession(res.token, res.user);
  }

  async updateProfile(changes: Partial<User>): Promise<void> {
    const res = await firstValueFrom(this.http.put<{ user: User }>(apiUrl('/users/me'), changes));
    this.user.set(res.user);
  }

  async updatePhoto(photo: File): Promise<void> {
    const form = new FormData();
    form.append('photo', photo, photo.name);
    const res = await firstValueFrom(this.http.put<{ user: User }>(apiUrl('/users/me/photo'), form));
    this.user.set(res.user);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await firstValueFrom(
      this.http.put(apiUrl('/users/me/password'), { currentPassword, newPassword }),
    );
  }

  async deleteAccount(): Promise<void> {
    await firstValueFrom(this.http.delete(apiUrl('/users/me')));
    this.logout();
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.user.set(null);
    this.socket.disconnect();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  private applySession(token: string, user: User): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.user.set(user);
    this.socket.connect(token);
  }
}
