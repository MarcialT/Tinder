import { Server } from 'socket.io';
import { verifyToken } from './auth.js';
import { queries, otherParticipant } from './db.js';

let io = null;

/** Sala privada de cada usuario: recibe matches nuevos y mensajes esten donde esten. */
const userRoom = (userId) => `user:${userId}`;
const matchRoom = (matchId) => `match:${matchId}`;

export function initRealtime(httpServer) {
  io = new Server(httpServer, { cors: { origin: '*' }, maxHttpBufferSize: 1e7 });

  // Handshake autenticado: el cliente manda el JWT en auth.token
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Falta el token'));
    try {
      const payload = verifyToken(String(token));
      const user = queries.userById.get(payload.sub);
      if (!user) return next(new Error('Usuario no encontrado'));
      socket.data.user = user;
      next();
    } catch {
      next(new Error('Token invalido'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    socket.join(userRoom(user.id));
    broadcastPresence(user.id, true);

    // El cliente entra a la sala de una conversacion concreta
    socket.on('chat:join', (matchId, ack) => {
      const match = queries.matchById.get(Number(matchId));
      if (!match || otherParticipant(match, user.id) === null) {
        return ack?.({ error: 'No perteneces a esta conversacion' });
      }
      socket.join(matchRoom(match.id));
      queries.markRead.run(match.id, user.id);
      io.to(userRoom(otherParticipant(match, user.id))).emit('chat:read', { matchId: match.id, by: user.id });
      ack?.({ ok: true });
    });

    socket.on('chat:leave', (matchId) => socket.leave(matchRoom(Number(matchId))));

    // Envio de mensaje en vivo (texto o imagen ya subida por REST)
    socket.on('chat:send', (payload, ack) => {
      const matchId = Number(payload?.matchId);
      const type = payload?.type === 'image' ? 'image' : 'text';
      const content = String(payload?.content ?? '').trim();

      if (!content) return ack?.({ error: 'El mensaje esta vacio' });

      const match = queries.matchById.get(matchId);
      const otherId = match ? otherParticipant(match, user.id) : null;
      if (!match || otherId === null) return ack?.({ error: 'No perteneces a esta conversacion' });

      const info = queries.insertMessage.run(matchId, user.id, type, content);
      const message = queries.messageById.get(Number(info.lastInsertRowid));

      emitChatMessage(matchId, otherId, message);
      ack?.({ ok: true, message });
    });

    socket.on('chat:typing', ({ matchId, typing }) => {
      socket.to(matchRoom(Number(matchId))).emit('chat:typing', { matchId: Number(matchId), userId: user.id, typing: !!typing });
    });

    socket.on('chat:read', (matchId) => {
      const match = queries.matchById.get(Number(matchId));
      const otherId = match ? otherParticipant(match, user.id) : null;
      if (otherId === null) return;
      queries.markRead.run(match.id, user.id);
      io.to(userRoom(otherId)).emit('chat:read', { matchId: match.id, by: user.id });
    });

    socket.on('disconnect', () => broadcastPresence(user.id, false));
  });

  return io;
}

function broadcastPresence(userId, online) {
  const matches = queries.matchesOfUser.all(userId, userId, userId, userId);
  for (const m of matches) {
    io.to(userRoom(m.userId)).emit('presence', { userId, online });
  }
}

/** Emite un evento a todas las sesiones abiertas de un usuario. */
export function emitToUser(userId, event, payload) {
  io?.to(userRoom(userId)).emit(event, payload);
}

/**
 * Emite un mensaje a la sala del match y a la sala personal del destinatario en una
 * sola llamada: si su socket esta en ambas (chat abierto), Socket.IO deduplica y solo
 * le llega una vez.
 */
export function emitChatMessage(matchId, otherUserId, message) {
  io?.to(matchRoom(matchId)).to(userRoom(otherUserId)).emit('chat:message', message);
}

export function isOnline(userId) {
  const room = io?.sockets.adapter.rooms.get(userRoom(userId));
  return !!room && room.size > 0;
}
