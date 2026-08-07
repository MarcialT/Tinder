import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { UPLOADS_DIR } from './db.js';
import { initRealtime } from './realtime.js';
import { authRouter } from './routes/auth.routes.js';
import { usersRouter } from './routes/users.routes.js';
import { socialRouter } from './routes/social.routes.js';
import { chatRouter } from './routes/chat.routes.js';

const PORT = Number(process.env.PORT) || 3000;
const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'foro-amigos' }));
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api', socialRouter);
app.use('/api/chats', chatRouter);

app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Manejador de errores (incluye los de multer: tamano/tipo de archivo)
app.use((err, _req, res, _next) => {
  console.error('[error]', err.message);
  const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
  res.status(status).json({ error: err.message || 'Error inesperado' });
});

const httpServer = createServer(app);
initRealtime(httpServer);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Foro Amigos API escuchando en el puerto ${PORT}`);
  console.log(`  Local:   http://localhost:${PORT}`);
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list || []) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`  Red:     http://${net.address}:${PORT}   <- usa esta IP desde el celular`);
      }
    }
  }
  console.log('');
});
