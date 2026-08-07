import { Component, OnDestroy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonIcon, IonSpinner, IonButton,
  IonRefresher, IonRefresherContent, IonItemSliding, IonItemOptions, IonItemOption,
  IonList, IonItem, IonLabel, IonAvatar, IonBadge, AlertController, ViewWillEnter,
} from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import { SocialService } from '../../core/social.service';
import { SocketService } from '../../core/socket.service';
import { AuthService } from '../../core/auth.service';
import { MatchSummary } from '../../core/models';
import { mediaUrl } from '../../core/api';

@Component({
  selector: 'app-matches',
  templateUrl: './matches.page.html',
  styleUrls: ['./matches.page.scss'],
  imports: [
    IonContent, IonHeader, IonToolbar, IonTitle, IonIcon, IonSpinner, IonButton,
    IonRefresher, IonRefresherContent, IonItemSliding, IonItemOptions, IonItemOption,
    IonList, IonItem, IonLabel, IonAvatar, IonBadge,
  ],
})
export class MatchesPage implements ViewWillEnter, OnDestroy {
  private social = inject(SocialService);
  private socket = inject(SocketService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private alerts = inject(AlertController);
  private subs: Subscription[] = [];

  readonly mediaUrl = mediaUrl;

  matches = signal<MatchSummary[]>([]);
  loading = signal(true);

  constructor() {
    // La lista se mantiene viva con los eventos del socket
    this.subs.push(
      this.socket.onMessage().subscribe((msg) => {
        const mine = msg.senderId === this.auth.user()?.id;
        this.matches.update((list) =>
          list
            .map((m) =>
              m.matchId === msg.matchId
                ? {
                    ...m,
                    lastMessage: msg.content,
                    lastMessageType: msg.type,
                    lastMessageAt: msg.createdAt,
                    unread: mine ? m.unread : m.unread + 1,
                  }
                : m,
            )
            .sort((a, b) => (b.lastMessageAt ?? b.matchedAt).localeCompare(a.lastMessageAt ?? a.matchedAt)),
        );
      }),
      this.socket.onNewMatch().subscribe(() => void this.load()),
      this.socket.onMatchRemoved().subscribe(({ matchId }) =>
        this.matches.update((list) => list.filter((m) => m.matchId !== matchId)),
      ),
      this.socket.onPresence().subscribe(({ userId, online }) =>
        this.matches.update((list) =>
          list.map((m) => (m.userId === userId ? { ...m, online } : m)),
        ),
      ),
    );
  }

  ionViewWillEnter(): void {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      this.matches.set(await this.social.matches());
    } finally {
      this.loading.set(false);
    }
  }

  async refresh(event: CustomEvent): Promise<void> {
    await this.load();
    (event.target as HTMLIonRefresherElement).complete();
  }

  open(match: MatchSummary): void {
    void this.router.navigate(['/chat', match.matchId]);
  }

  async confirmRemove(match: MatchSummary): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Eliminar amistad',
      message: `Se borrara tu conversacion con ${match.name}. Esta accion no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.social.removeMatch(match.matchId);
            this.matches.update((list) => list.filter((m) => m.matchId !== match.matchId));
          },
        },
      ],
    });
    await alert.present();
  }

  preview(match: MatchSummary): string {
    if (!match.lastMessage) return 'Dile hola para romper el hielo';
    return match.lastMessageType === 'image' ? '📷 Foto' : match.lastMessage;
  }

  when(iso: string | null): string {
    if (!iso) return '';
    const date = new Date(iso.replace(' ', 'T') + 'Z');
    const sameDay = date.toDateString() === new Date().toDateString();
    return sameDay
      ? date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString('es', { day: '2-digit', month: 'short' });
  }

  initials(name: string): string {
    return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }
}
