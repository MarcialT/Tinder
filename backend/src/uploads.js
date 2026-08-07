import multer from 'multer';
import { randomBytes } from 'node:crypto';
import { extname } from 'node:path';
import { UPLOADS_DIR } from './db.js';

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    let ext = extname(file.originalname || '').toLowerCase();
    if (!ALLOWED.has(ext)) ext = '.jpg';
    cb(null, `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Solo se permiten imagenes'));
    }
    cb(null, true);
  },
});

/** Convierte el archivo subido en la URL publica que consume la app. */
export function publicUrl(file) {
  return file ? `/uploads/${file.filename}` : null;
}
