import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { queries } from '../db.js';
import { signToken, requireAuth } from '../auth.js';
import { upload, publicUrl } from '../uploads.js';

export const authRouter = Router();

// POST /api/auth/register  (multipart/form-data, campo de archivo: "photo")
authRouter.post('/register', upload.single('photo'), (req, res) => {
  const { name, email, password, birthdate, gender, interestedIn, bio, city, interests } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nombre, correo y contrasena son obligatorios' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'La contrasena debe tener al menos 6 caracteres' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  if (queries.userByEmail.get(normalizedEmail)) {
    return res.status(409).json({ error: 'Ese correo ya esta registrado' });
  }

  const hash = bcrypt.hashSync(String(password), 10);
  const info = queries.insertUser.run(
    String(name).trim(),
    normalizedEmail,
    hash,
    birthdate || null,
    gender || null,
    interestedIn || 'todos',
    bio || '',
    city || '',
    interests || '',
    publicUrl(req.file),
  );

  const user = queries.userById.get(Number(info.lastInsertRowid));
  res.status(201).json({ token: signToken(user), user });
});

// POST /api/auth/login
authRouter.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Correo y contrasena son obligatorios' });
  }

  const row = queries.userByEmail.get(String(email).trim().toLowerCase());
  if (!row || !bcrypt.compareSync(String(password), row.password_hash)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const user = queries.userById.get(row.id);
  res.json({ token: signToken(user), user });
});

// GET /api/auth/me  -> revalida la sesion guardada en el dispositivo
authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
