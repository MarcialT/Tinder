import { Router } from 'express';
import { queries, otherParticipant } from '../db.js';
import { requireAuth } from '../auth.js';
import { upload, publicUrl } from '../uploads.js';
import { emitToUser, emitChatMessage, isOnline } from '../realtime.js';

export const chatRouter = Router();
chatRouter.use(requireAuth);

/** Comprueba que el usuario autenticado pertenece al match indicado. */
function loadMatch(req, res) {
  const match = queries.matchById.get(Number(req.params.id));
  const otherId = match ? otherParticipant(match, req.user.id) : null;
  if (!match || otherId === null) {
    res.status(404).json({ error: 'Conversacion no encontrada' });
    return null;
  }
  return { match, otherId };
}

// GET /api/chats/:id/messages?before=<id>&limit=30  (historial persistido, paginado)
chatRouter.get('/:id/messages', (req, res) => {
  const ctx = loadMatch(req, res);
  if (!ctx) return;

  const before = Number(req.query.before) || Number.MAX_SAFE_INTEGER;
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const messages = queries.messagesOfMatch.all(ctx.match.id, before, limit).reverse();

  const other = queries.publicUserById.get(ctx.otherId);
  res.json({
    matchId: ctx.match.id,
    other,
    online: isOnline(ctx.otherId),
    messages,
    hasMore: messages.length === limit,
  });
});

// POST /api/chats/:id/messages  -> respaldo REST del envio por WebSocket
chatRouter.post('/:id/messages', (req, res) => {
  const ctx = loadMatch(req, res);
  if (!ctx) return;

  const type = req.body?.type === 'image' ? 'image' : 'text';
  const content = String(req.body?.content ?? '').trim();
  if (!content) return res.status(400).json({ error: 'El mensaje esta vacio' });

  const info = queries.insertMessage.run(ctx.match.id, req.user.id, type, content);
  const message = queries.messageById.get(Number(info.lastInsertRowid));

  emitChatMessage(ctx.match.id, ctx.otherId, message);
  res.status(201).json({ message });
});

// POST /api/chats/:id/images -> sube la imagen y la envia como mensaje
chatRouter.post('/:id/images', upload.single('image'), (req, res) => {
  const ctx = loadMatch(req, res);
  if (!ctx) return;
  if (!req.file) return res.status(400).json({ error: 'No se recibio ninguna imagen' });

  const info = queries.insertMessage.run(ctx.match.id, req.user.id, 'image', publicUrl(req.file));
  const message = queries.messageById.get(Number(info.lastInsertRowid));

  emitChatMessage(ctx.match.id, ctx.otherId, message);
  res.status(201).json({ message });
});

// POST /api/chats/:id/read -> marca como leidos los mensajes recibidos
chatRouter.post('/:id/read', (req, res) => {
  const ctx = loadMatch(req, res);
  if (!ctx) return;
  queries.markRead.run(ctx.match.id, req.user.id);
  emitToUser(ctx.otherId, 'chat:read', { matchId: ctx.match.id, by: req.user.id });
  res.json({ ok: true });
});
