import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { Message, NewMatchEvent } from './models';

/**
 * Cliente de WebSockets (Socket.IO). Mantiene una unica conexion autenticada
 * para todo el ciclo de vida de la sesion.
 */
@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;
  readonly connected = signal(false);

  connect(token: string): void {
    if (this.socket) this.disconnect();

    this.socket = io(environment.apiUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => this.connected.set(true));
    this.socket.on('disconnect', () => this.connected.set(false));
    this.socket.on('connect_error', (err) => console.warn('[socket]', err.message));
  }

  disconnect(): void {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.connected.set(false);
  }

  joinChat(matchId: number): void {
    this.socket?.emit('chat:join', matchId);
  }

  leaveChat(matchId: number): void {
    this.socket?.emit('chat:leave', matchId);
  }

  /** Envia un mensaje y resuelve con el mensaje ya persistido por el servidor. */
  send(matchId: number, content: string, type: 'text' | 'image' = 'text'): Promise<Message> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) return reject(new Error('Sin conexion en tiempo real'));
      this.socket.emit(
        'chat:send',
        { matchId, content, type },
        (res: { ok?: boolean; message?: Message; error?: string }) => {
          res?.ok && res.message ? resolve(res.message) : reject(new Error(res?.error || 'Error'));
        },
      );
    });
  }

  setTyping(matchId: number, typing: boolean): void {
    this.socket?.emit('chat:typing', { matchId, typing });
  }

  markRead(matchId: number): void {
    this.socket?.emit('chat:read', matchId);
  }

  /** Convierte cualquier evento del servidor en un Observable para las paginas. */
  private on<T>(event: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      const handler = (payload: T) => subscriber.next(payload);
      this.socket?.on(event, handler as never);
      return () => this.socket?.off(event, handler as never);
    });
  }

  onMessage(): Observable<Message> {
    return this.on<Message>('chat:message');
  }

  onTyping(): Observable<{ matchId: number; userId: number; typing: boolean }> {
    return this.on('chat:typing');
  }

  onRead(): Observable<{ matchId: number; by: number }> {
    return this.on('chat:read');
  }

  onNewMatch(): Observable<NewMatchEvent> {
    return this.on<NewMatchEvent>('match:new');
  }

  onMatchRemoved(): Observable<{ matchId: number }> {
    return this.on('match:removed');
  }

  onPresence(): Observable<{ userId: number; online: boolean }> {
    return this.on('presence');
  }
}
