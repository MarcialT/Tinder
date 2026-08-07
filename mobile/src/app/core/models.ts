export interface User {
  id: number;
  name: string;
  email: string;
  birthdate: string | null;
  gender: string | null;
  interestedIn: string;
  bio: string;
  city: string;
  interests: string;
  photoUrl: string | null;
  createdAt: string;
  age?: number | null;
}

export interface MatchSummary {
  matchId: number;
  matchedAt: string;
  userId: number;
  name: string;
  photoUrl: string | null;
  bio: string;
  lastMessage: string | null;
  lastMessageType: 'text' | 'image' | null;
  lastMessageAt: string | null;
  unread: number;
  online: boolean;
}

export interface Message {
  id: number;
  matchId: number;
  senderId: number;
  type: 'text' | 'image';
  content: string;
  createdAt: string;
  readAt: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface NewMatchEvent {
  matchId: number;
  user: User;
  matchedAt: string;
}
