// Capa de persistencia. Usa el modulo `node:sqlite` incluido en Node >= 22.5
// para no depender de modulos nativos que haya que compilar en Windows.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = join(__dirname, '..');
export const UPLOADS_DIR = join(ROOT_DIR, 'uploads');
const DATA_DIR = join(ROOT_DIR, 'data');

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(UPLOADS_DIR, { recursive: true });

export const db = new DatabaseSync(join(DATA_DIR, 'foro-amigos.db'));

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  birthdate     TEXT,
  gender        TEXT,
  interested_in TEXT    DEFAULT 'todos',
  bio           TEXT    DEFAULT '',
  city          TEXT    DEFAULT '',
  interests     TEXT    DEFAULT '',
  photo_url     TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS swipes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  from_user  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action     TEXT    NOT NULL CHECK (action IN ('like', 'pass')),
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (from_user, to_user)
);

CREATE TABLE IF NOT EXISTS matches (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_a     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_a, user_b)
);

CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id   INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT    NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image')),
  content    TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  read_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_messages_match ON messages (match_id, id);
CREATE INDEX IF NOT EXISTS idx_swipes_from    ON swipes (from_user);
`);

/** Ordena la pareja para que (a, b) sea siempre unica en la tabla matches. */
export function pairKey(id1, id2) {
  return id1 < id2 ? [id1, id2] : [id2, id1];
}

const PUBLIC_FIELDS = `id, name, email, birthdate, gender, interested_in AS interestedIn,
                       bio, city, interests, photo_url AS photoUrl, created_at AS createdAt`;

export const queries = {
  userByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  userById: db.prepare(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`),
  insertUser: db.prepare(`INSERT INTO users
    (name, email, password_hash, birthdate, gender, interested_in, bio, city, interests, photo_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  updateUser: db.prepare(`UPDATE users SET
    name = ?, birthdate = ?, gender = ?, interested_in = ?, bio = ?, city = ?, interests = ?
    WHERE id = ?`),
  updatePhoto: db.prepare('UPDATE users SET photo_url = ? WHERE id = ?'),
  updatePassword: db.prepare('UPDATE users SET password_hash = ? WHERE id = ?'),
  deleteUser: db.prepare('DELETE FROM users WHERE id = ?'),

  candidates: db.prepare(`
    SELECT ${PUBLIC_FIELDS} FROM users
    WHERE id != ?
      AND id NOT IN (SELECT to_user FROM swipes WHERE from_user = ?)
    ORDER BY created_at DESC
    LIMIT ?`),

  insertSwipe: db.prepare(`INSERT INTO swipes (from_user, to_user, action) VALUES (?, ?, ?)
    ON CONFLICT (from_user, to_user) DO UPDATE SET action = excluded.action`),
  deleteSwipe: db.prepare('DELETE FROM swipes WHERE from_user = ? AND to_user = ?'),
  likeBack: db.prepare(`SELECT 1 FROM swipes
    WHERE from_user = ? AND to_user = ? AND action = 'like'`),

  insertMatch: db.prepare(`INSERT INTO matches (user_a, user_b) VALUES (?, ?)
    ON CONFLICT (user_a, user_b) DO NOTHING`),
  matchByPair: db.prepare('SELECT * FROM matches WHERE user_a = ? AND user_b = ?'),
  matchById: db.prepare('SELECT * FROM matches WHERE id = ?'),
  deleteMatch: db.prepare('DELETE FROM matches WHERE id = ?'),

  matchesOfUser: db.prepare(`
    SELECT m.id                AS matchId,
           m.created_at        AS matchedAt,
           u.id                AS userId,
           u.name              AS name,
           u.photo_url         AS photoUrl,
           u.bio               AS bio,
           (SELECT content    FROM messages WHERE match_id = m.id ORDER BY id DESC LIMIT 1) AS lastMessage,
           (SELECT type       FROM messages WHERE match_id = m.id ORDER BY id DESC LIMIT 1) AS lastMessageType,
           (SELECT created_at FROM messages WHERE match_id = m.id ORDER BY id DESC LIMIT 1) AS lastMessageAt,
           (SELECT COUNT(*)   FROM messages WHERE match_id = m.id AND sender_id != ? AND read_at IS NULL) AS unread
    FROM matches m
    JOIN users u ON u.id = CASE WHEN m.user_a = ? THEN m.user_b ELSE m.user_a END
    WHERE m.user_a = ? OR m.user_b = ?
    ORDER BY COALESCE(lastMessageAt, m.created_at) DESC`),

  messagesOfMatch: db.prepare(`
    SELECT id, match_id AS matchId, sender_id AS senderId, type, content,
           created_at AS createdAt, read_at AS readAt
    FROM messages
    WHERE match_id = ? AND id < ?
    ORDER BY id DESC
    LIMIT ?`),
  insertMessage: db.prepare(`INSERT INTO messages (match_id, sender_id, type, content)
    VALUES (?, ?, ?, ?)`),
  messageById: db.prepare(`
    SELECT id, match_id AS matchId, sender_id AS senderId, type, content,
           created_at AS createdAt, read_at AS readAt
    FROM messages WHERE id = ?`),
  markRead: db.prepare(`UPDATE messages SET read_at = datetime('now')
    WHERE match_id = ? AND sender_id != ? AND read_at IS NULL`),
};

/** Devuelve el id del otro participante de un match, o null si el usuario no pertenece. */
export function otherParticipant(match, userId) {
  if (match.user_a === userId) return match.user_b;
  if (match.user_b === userId) return match.user_a;
  return null;
}
