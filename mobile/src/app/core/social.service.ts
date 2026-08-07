import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { apiUrl } from './api';
import { MatchSummary, Message, User } from './models';

export interface ChatHistory {
  matchId: number;
  other: User;
  online: boolean;
  messages: Message[];
  hasMore: boolean;
}

export interface SwipeResult {
  match: boolean;
  matchId?: number;
  user?: User;
}

@Injectable({ providedIn: 'root' })
export class SocialService {
  private http = inject(HttpClient);

  discover(limit = 20): Promise<User[]> {
    return firstValueFrom(
      this.http.get<{ candidates: User[] }>(apiUrl(`/discover?limit=${limit}`)),
    ).then((r) => r.candidates);
  }

  swipe(targetId: number, action: 'like' | 'pass'): Promise<SwipeResult> {
    return firstValueFrom(this.http.post<SwipeResult>(apiUrl('/swipes'), { targetId, action }));
  }

  undoSwipe(targetId: number): Promise<unknown> {
    return firstValueFrom(this.http.delete(apiUrl(`/swipes/${targetId}`)));
  }

  matches(): Promise<MatchSummary[]> {
    return firstValueFrom(
      this.http.get<{ matches: MatchSummary[] }>(apiUrl('/matches')),
    ).then((r) => r.matches);
  }

  removeMatch(matchId: number): Promise<unknown> {
    return firstValueFrom(this.http.delete(apiUrl(`/matches/${matchId}`)));
  }

  history(matchId: number, before?: number): Promise<ChatHistory> {
    const query = before ? `?before=${before}` : '';
    return firstValueFrom(this.http.get<ChatHistory>(apiUrl(`/chats/${matchId}/messages${query}`)));
  }

  /** Sube una imagen al chat; el servidor la persiste y la difunde por WebSocket. */
  sendImage(matchId: number, file: File): Promise<Message> {
    const form = new FormData();
    form.append('image', file, file.name);
    return firstValueFrom(
      this.http.post<{ message: Message }>(apiUrl(`/chats/${matchId}/images`), form),
    ).then((r) => r.message);
  }

  /** Respaldo por REST cuando el socket no esta conectado. */
  sendMessageRest(matchId: number, content: string): Promise<Message> {
    return firstValueFrom(
      this.http.post<{ message: Message }>(apiUrl(`/chats/${matchId}/messages`), { content }),
    ).then((r) => r.message);
  }
}
