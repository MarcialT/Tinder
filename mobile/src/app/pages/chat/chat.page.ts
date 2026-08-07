import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonIcon, IonButton, IonSpinner,
  IonButtons, IonBackButton, IonAvatar, IonFooter, IonTextarea, ToastController,
} from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import { SocialService } from '../../core/social.service';
import { SocketService } from '../../core/socket.service';
import { AuthService } from '../../core/auth.service';
import { Message, User } from '../../core/models';
import { mediaUrl } from '../../core/api';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  imports: [
    FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, IonIcon, IonButton, IonSpinner,
    IonButtons, IonBackButton, IonAvatar, IonFooter, IonTextarea,
  ],
})
export class ChatPage implements OnInit, OnDestroy, AfterViewChecked {
  private route = inject(ActivatedRoute);
  private social = inject(SocialService);
  private socket = inject(SocketService);
  private auth = inject(AuthService);
  private toast = inject(ToastController);
  private subs: Subscription[] = [];

  @ViewChild(IonContent) content?: IonContent;
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  readonly mediaUrl = mediaUrl;

  matchId = 0;
  other = signal<User | null>(null);
  messages = signal<Message[]>([]);
  loading = signal(true);
  loadingMore = signal(false);
  hasMore = signal(false);
  sending = signal(false);
  otherTyping = signal(false);
  otherOnline = signal(false);
  lightbox = signal<string>('');
  draft = '';

  private shouldScroll = false;
  private typingTimer: ReturnType<typeof setTimeout> | null = null;
  private typingSent = false;

  get myId(): number {
    return this.auth.user()?.id ?? 0;
  }

  async ngOnInit(): Promise<void> {
    this.matchId = Number(this.route.snapshot.paramMap.get('matchId'));
    await this.loadHistory();

    this.socket.joinChat(this.matchId);
    this.socket.markRead(this.matchId);

    this.subs.push(
      this.socket.onMessage().subscribe((msg) => {
        if (msg.matchId !== this.matchId) return;
        // El emisor ya inserto el mensaje al recibir el ack del servidor
        if (this.messages().some((m) => m.id === msg.id)) return;
        this.messages.update((list) => [...list, msg]);
        this.shouldScroll = true;
        if (msg.senderId !== this.myId) this.socket.markRead(this.matchId);
      }),
      this.socket.onTyping().subscribe(({ matchId, userId, typing }) => {
        if (matchId === this.matchId && userId !== this.myId) this.otherTyping.set(typing);
      }),
      this.socket.onRead().subscribe(({ matchId, by }) => {
        if (matchId !== this.matchId || by === this.myId) return;
        const now = new Date().toISOString();
        this.messages.update((list) =>
          list.map((m) => (m.senderId === this.myId && !m.readAt ? { ...m, readAt: now } : m)),
        );
      }),
      this.socket.onPresence().subscribe(({ userId, online }) => {
        if (userId !== this.other()?.id) return;
        this.otherOnline.set(online);
        if (!online) this.otherTyping.set(false);
      }),
    );
  }

  private async loadHistory(): Promise<void> {
    try {
      const res = await this.social.history(this.matchId);
      this.other.set(res.other);
      this.otherOnline.set(res.online);
      this.messages.set(res.messages);
      this.hasMore.set(res.hasMore);
      this.shouldScroll = true;
    } finally {
      this.loading.set(false);
    }
  }

  /** Carga la pagina anterior de mensajes al llegar arriba del historial. */
  async loadOlder(): Promise<void> {
    const oldest = this.messages()[0];
    if (!oldest || this.loadingMore() || !this.hasMore()) return;

    this.loadingMore.set(true);
    try {
      const res = await this.social.history(this.matchId, oldest.id);
      this.messages.update((list) => [...res.messages, ...list]);
      this.hasMore.set(res.hasMore);
    } finally {
      this.loadingMore.set(false);
    }
  }

  onScroll(event: CustomEvent): void {
    if ((event.detail as { scrollTop: number }).scrollTop < 40) void this.loadOlder();
  }

  // ----- Envio -------------------------------------------------------------

  async send(): Promise<void> {
    const text = this.draft.trim();
    if (!text || this.sending()) return;

    this.sending.set(true);
    this.draft = '';
    this.stopTyping();

    try {
      const message = this.socket.connected()
        ? await this.socket.send(this.matchId, text)
        : await this.social.sendMessageRest(this.matchId, text);

      if (!this.messages().some((m) => m.id === message.id)) {
        this.messages.update((list) => [...list, message]);
      }
      this.shouldScroll = true;
    } catch {
      this.draft = text; // devuelve el texto para que no se pierda
      await this.showError('No se pudo enviar el mensaje');
    } finally {
      this.sending.set(false);
    }
  }

  pickImage(): void {
    this.fileInput?.nativeElement.click();
  }

  async onImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.sending.set(true);
    try {
      const message = await this.social.sendImage(this.matchId, file);
      if (!this.messages().some((m) => m.id === message.id)) {
        this.messages.update((list) => [...list, message]);
      }
      this.shouldScroll = true;
    } catch {
      await this.showError('No se pudo enviar la imagen');
    } finally {
      this.sending.set(false);
    }
  }

  /** Notifica "escribiendo..." y lo apaga solo tras 1,5 s de inactividad. */
  onTyping(): void {
    if (!this.typingSent) {
      this.socket.setTyping(this.matchId, true);
      this.typingSent = true;
    }
    if (this.typingTimer) clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => this.stopTyping(), 1500);
  }

  private stopTyping(): void {
    if (this.typingTimer) clearTimeout(this.typingTimer);
    this.typingTimer = null;
    if (this.typingSent) {
      this.socket.setTyping(this.matchId, false);
      this.typingSent = false;
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.send();
    }
  }

  // ----- Utilidades de presentacion ---------------------------------------

  time(iso: string): string {
    return new Date(iso.replace(' ', 'T') + 'Z')
      .toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  }

  /** Devuelve la fecha a mostrar como separador, o null si repite la anterior. */
  daySeparator(index: number): string | null {
    const list = this.messages();
    const current = new Date(list[index].createdAt.replace(' ', 'T') + 'Z');
    if (index > 0) {
      const previous = new Date(list[index - 1].createdAt.replace(' ', 'T') + 'Z');
      if (previous.toDateString() === current.toDateString()) return null;
    }
    const today = new Date();
    if (current.toDateString() === today.toDateString()) return 'Hoy';
    return current.toLocaleDateString('es', { day: '2-digit', month: 'long' });
  }

  initials(name: string): string {
    return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  }

  private async showError(message: string): Promise<void> {
    const toast = await this.toast.create({ message, duration: 2500, color: 'danger' });
    await toast.present();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.shouldScroll = false;
      void this.content?.scrollToBottom(200);
    }
  }

  ngOnDestroy(): void {
    this.stopTyping();
    this.socket.leaveChat(this.matchId);
    this.subs.forEach((s) => s.unsubscribe());
  }
}
