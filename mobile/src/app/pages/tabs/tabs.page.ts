import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import {
  IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge, ToastController,
} from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { SocketService } from '../../core/socket.service';
import { SocialService } from '../../core/social.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge],
})
export class TabsPage implements OnInit, OnDestroy {
  private socket = inject(SocketService);
  private social = inject(SocialService);
  private auth = inject(AuthService);
  private toast = inject(ToastController);
  private router = inject(Router);
  private subs: Subscription[] = [];

  unread = signal(0);

  async ngOnInit(): Promise<void> {
    await this.refreshUnread();

    // Avisos globales: llegan aunque el usuario no tenga el chat abierto
    this.subs.push(
      this.socket.onMessage().subscribe((msg) => {
        if (msg.senderId === this.auth.user()?.id) return;
        if (this.router.url.startsWith(`/chat/${msg.matchId}`)) return;
        this.unread.update((n) => n + 1);
      }),
      this.socket.onNewMatch().subscribe(async (evt) => {
        const toast = await this.toast.create({
          message: `Nueva amistad con ${evt.user.name}!`,
          duration: 3500,
          color: 'danger',
          position: 'top',
          buttons: [{ text: 'Chatear', handler: () => this.router.navigate(['/chat', evt.matchId]) }],
        });
        await toast.present();
      }),
    );
  }

  async refreshUnread(): Promise<void> {
    try {
      const matches = await this.social.matches();
      this.unread.set(matches.reduce((total, m) => total + m.unread, 0));
    } catch {
      /* sin conexion: se recalcula en el proximo ingreso */
    }
  }

  onTabChange(tab: string): void {
    if (tab === 'amigos') void this.refreshUnread();
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }
}
