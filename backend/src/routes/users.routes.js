import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { queries, UPLOADS_DIR } from '../db.js';
import { requireAuth } from '../auth.js';
import { upload, publicUrl } from '../uploads.js';
import { validateName, validatePassword } from '../validation.js';

export const usersRouter = Router();
usersRouter.use(requireAuth);

/** Borra del disco una foto anterior servida desde /uploads. */
async function removeStoredPhoto(photoUrl) {
  if (!photoUrl || !photoUrl.startsWith('/uploads/')) return;
  try {
    await unlink(join(UPLOADS_DIR, photoUrl.replace('/uploads/', '')));
  } catch {
    /* el archivo ya no existe: no es un error para el usuario */
  }
}

// READ
usersRouter.get('/me', (req, res) => res.json({ user: req.user }));

// UPDATE (datos del perfil)
usersRouter.put('/me', (req, res) => {
  const b = req.body;
  const current = req.user;

  if (b.name !== undefined) {
    const nameError = validateName(b.name);
    if (nameError) return res.status(400).json({ error: nameError });
  }

  queries.updateUser.run(
    (b.name ?? current.name).trim(),
    b.birthdate ?? current.birthdate,
    b.gender ?? current.gender,
    b.interestedIn ?? current.interestedIn,
    b.bio !== undefined ? String(b.bio).trim() : current.bio,
    b.city !== undefined ? String(b.city).trim() : current.city,
    b.interests ?? current.interests,
    current.id,
  );
  res.json({ user: queries.userById.get(current.id) });
});

// UPDATE (foto de perfil)
usersRouter.put('/me/photo', upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibio ninguna imagen' });
  await removeStoredPhoto(req.user.photoUrl);
  queries.updatePhoto.run(publicUrl(req.file), req.user.id);
  res.json({ user: queries.userById.get(req.user.id) });
});

// UPDATE (contraseña)
usersRouter.put('/me/password', (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (typeof currentPassword !== 'string' || !currentPassword) {
    return res.status(400).json({ error: 'Debes ingresar tu contraseña actual para cambiarla' });
  }
  const row = queries.userByEmail.get(req.user.email);
  if (!bcrypt.compareSync(currentPassword, row.password_hash)) {
    return res.status(401).json({ error: 'La contraseña actual no es correcta' });
  }
  const passwordError = validatePassword(newPassword);
  if (passwordError) return res.status(400).json({ error: passwordError });
  if (newPassword === currentPassword) {
    return res.status(400).json({ error: 'La nueva contraseña debe ser distinta a la actual' });
  }
  queries.updatePassword.run(bcrypt.hashSync(newPassword, 10), req.user.id);
  res.json({ ok: true });
});

// DELETE (elimina la cuenta y en cascada swipes, matches y mensajes)
usersRouter.delete('/me', async (req, res) => {
  await removeStoredPhoto(req.user.photoUrl);
  queries.deleteUser.run(req.user.id);
  res.json({ ok: true });
});

// READ de otro perfil
usersRouter.get('/:id', (req, res) => {
  const user = queries.publicUserById.get(Number(req.params.id));
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ user });
});
