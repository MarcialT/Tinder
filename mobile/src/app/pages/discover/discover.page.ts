import { Component, OnDestroy, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonIcon, IonButton, IonSpinner,
  IonRefresher, IonRefresherContent, ViewWillEnter,
} from '@ionic/angular/standalone';
import { SocialService } from '../../core/social.service';
import { AuthService } from '../../core/auth.service';
import { User } from '../../core/models';
import { mediaUrl } from '../../core/api';
import { ExpandableTextComponent } from '../../shared/expandable-text/expandable-text.component';

type Direction = 'like' | 'pass';

/** Distancia (en px) a partir de la cual soltar la tarjeta cuenta como decision. */
const THRESHOLD = 110;

@Component({
  selector: 'app-discover',
  templateUrl: './discover.page.html',
  styleUrls: ['./discover.page.scss'],
  imports: [
    IonContent, IonHeader, IonToolbar, IonTitle, IonIcon, IonButton, IonSpinner,
    IonRefresher, IonRefresherContent, ExpandableTextComponent,
  ],
})
export class DiscoverPage implements ViewWillEnter, OnDestroy {
  private social = inject(SocialService);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly mediaUrl = mediaUrl;

  cards = signal<User[]>([]);
  loading = signal(true);
  dragX = signal(0);
  dragY = signal(0);
  dragging = signal(false);
  exiting = signal<Direction | null>(null);
  lastPassed = signal<User | null>(null);
  matchedWith = signal<{ user: User; matchId: number } | null>(null);

  /** Tarjetas visibles del mazo: la primera es la que se arrastra. */
  visible = computed(() => this.cards().slice(0, 3));

  /** -1 (rechazar) .. 0 .. 1 (aceptar): controla los sellos y el color del borde. */
  intent = computed(() => Math.max(-1, Math.min(1, this.dragX() / THRESHOLD)));

  private pointerId: number | null = null;
  private startX = 0;
  private startY = 0;

  ionViewWillEnter(): void {
    if (this.cards().length === 0) void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.cards.set(await this.social.discover(30));
    } catch {
      this.cards.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async refresh(event: CustomEvent): Promise<void> {
    await this.load();
    (event.target as HTMLIonRefresherElement).complete();
  }

  // ----- Gesto de arrastre -------------------------------------------------

  onPointerDown(event: PointerEvent): void {
    if (this.exiting() || this.cards().length === 0) return;
    this.pointerId = event.pointerId;
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.dragging.set(true);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.dragging() || event.pointerId !== this.pointerId) return;
    this.dragX.set(event.clientX - this.startX);
    this.dragY.set(event.clientY - this.startY);
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.dragging() || event.pointerId !== this.pointerId) return;
    this.dragging.set(false);
    this.pointerId = null;

    const dx = this.dragX();
    if (Math.abs(dx) >= THRESHOLD) {
      void this.decide(dx > 0 ? 'like' : 'pass');
    } else {
      this.resetDrag();
    }
  }

  private resetDrag(): void {
    this.dragX.set(0);
    this.dragY.set(0);
  }

  cardTransform(index: number): string {
    if (index > 0) {
      const scale = 1 - index * 0.05;
      return `translateY(${index * 12}px) scale(${scale})`;
    }
    if (this.exiting()) {
      const dir = this.exiting() === 'like' ? 1 : -1;
      return `translate(${dir * 700}px, ${this.dragY()}px) rotate(${dir * 28}deg)`;
    }
    return `translate(${this.dragX()}px, ${this.dragY()}px) rotate(${this.dragX() / 22}deg)`;
  }

  // ----- Decision ----------------------------------------------------------

  /** Aceptar (derecha) o rechazar (izquierda) al perfil que esta arriba del mazo. */
  async decide(action: Direction): Promise<void> {
    const target = this.cards()[0];
    if (!target || this.exiting()) return;

    this.exiting.set(action);
    if (action === 'pass') this.lastPassed.set(target);

    // Deja correr la animacion de salida antes de quitar la tarjeta del mazo
    setTimeout(() => {
      this.cards.update((list) => list.slice(1));
      this.exiting.set(null);
      this.resetDrag();
    }, 260);

    try {
      const res = await this.social.swipe(target.id, action);
      if (res.match && res.user && res.matchId) {
        this.matchedWith.set({ user: res.user, matchId: res.matchId });
      }
    } catch {
      /* el swipe se reintenta la proxima vez que el perfil vuelva a aparecer */
    }
  }

  /** Deshace el ultimo descarte y devuelve el perfil al mazo. */
  async undo(): Promise<void> {
    const user = this.lastPassed();
    if (!user) return;
    this.lastPassed.set(null);
    try {
      await this.social.undoSwipe(user.id);
      this.cards.update((list) => [user, ...list]);
    } catch {
      /* si falla, el perfil reaparecera al recargar */
    }
  }

  openChat(): void {
    const match = this.matchedWith();
    this.matchedWith.set(null);
    if (match) void this.router.navigate(['/chat', match.matchId]);
  }

  initials(name: string): string {
    return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  }

  interestList(user: User): string[] {
    return (user.interests || '').split(',').map((i) => i.trim()).filter(Boolean).slice(0, 4);
  }

  myName(): string {
    return this.auth.user()?.name.split(' ')[0] ?? '';
  }

  ngOnDestroy(): void {
    this.pointerId = null;
  }
}
