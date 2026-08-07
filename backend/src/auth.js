import jwt from 'jsonwebtoken';
import { queries } from './db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'foro-amigos-secreto-desarrollo';
const EXPIRES_IN = '30d';

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/** Middleware Express: exige un Bearer token valido y adjunta req.user. */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Falta el token de autenticacion' });

  try {
    const payload = verifyToken(token);
    const user = queries.userById.get(payload.sub);
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalido o expirado' });
  }
}
