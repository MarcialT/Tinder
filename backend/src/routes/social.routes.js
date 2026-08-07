import { Router } from 'express';
import { queries, pairKey, otherParticipant } from '../db.js';
import { requireAuth } from '../auth.js';
import { emitToUser, isOnline } from '../realtime.js';

export const socialRouter = Router();
socialRouter.use(requireAuth);

// GET /api/discover -> perfiles todavia sin decidir
socialRouter.get('/discover', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const me = req.user;
  let candidates = queries.candidates.all(me.id, me.id, limit);

  // Filtro de preferencia: 'todos' no descarta a nadie
  if (me.interestedIn && me.interestedIn !== 'todos') {
    candidates = candidates.filter((c) => !c.gender || c.gender === me.interestedIn);
  }

  res.json({ candidates: candidates.map(withAge) });
});

// POST /api/swipes { targetId, action: 'like' | 'pass' }
socialRouter.post('/swipes', (req, res) => {
  const me = req.user;
  const targetId = Number(req.body?.targetId);
  const action = req.body?.action === 'pass' ? 'pass' : 'like';

  if (!targetId || targetId === me.id) return res.status(400).json({ error: 'Perfil invalido' });
  const target = queries.userById.get(targetId);
  if (!target) return res.status(404).json({ error: 'Ese perfil ya no existe' });

  queries.insertSwipe.run(me.id, targetId, action);

  // Solo hay match si el "like" es mutuo
  if (action === 'pass' || !queries.likeBack.get(targetId, me.id)) {
    return res.json({ match: false });
  }

  const [a, b] = pairKey(me.id, targetId);
  queries.insertMatch.run(a, b);
  const match = queries.matchByPair.get(a, b);

  const payloadForMe = { matchId: match.id, user: withAge(target), matchedAt: match.created_at };
  const payloadForThem = { matchId: match.id, user: withAge(me), matchedAt: match.created_at };
  emitToUser(targetId, 'match:new', payloadForThem);
  emitToUser(me.id, 'match:new', payloadForMe);

  res.json({ match: true, ...payloadForMe });
});

// DELETE /api/swipes/:targetId -> deshacer el ultimo descarte
socialRouter.delete('/swipes/:targetId', (req, res) => {
  queries.deleteSwipe.run(req.user.id, Number(req.params.targetId));
  res.json({ ok: true });
});

// GET /api/matches -> lista de amistades con su ultimo mensaje
socialRouter.get('/matches', (req, res) => {
  const id = req.user.id;
  const matches = queries.matchesOfUser.all(id, id, id, id)
    .map((m) => ({ ...m, unread: Number(m.unread) || 0, online: isOnline(m.userId) }));
  res.json({ matches });
});

// DELETE /api/matches/:id -> deshacer la amistad (borra tambien el chat)
socialRouter.delete('/matches/:id', (req, res) => {
  const match = queries.matchById.get(Number(req.params.id));
  const otherId = match ? otherParticipant(match, req.user.id) : null;
  if (!match || otherId === null) return res.status(404).json({ error: 'Amistad no encontrada' });

  queries.deleteMatch.run(match.id);
  emitToUser(otherId, 'match:removed', { matchId: match.id });
  res.json({ ok: true });
});

/** Anade la edad calculada a partir de la fecha de nacimiento. */
function withAge(user) {
  if (!user?.birthdate) return { ...user, age: null };
  const born = new Date(user.birthdate);
  if (Number.isNaN(born.getTime())) return { ...user, age: null };
  const diff = Date.now() - born.getTime();
  return { ...user, age: Math.floor(diff / (365.25 * 24 * 3600 * 1000)) };
}
