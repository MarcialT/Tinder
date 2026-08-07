// Carga perfiles de prueba para poder deslizar tarjetas desde el primer arranque.
// Uso:  npm run seed        (todas las cuentas usan la contrasena 123456)
import bcrypt from 'bcryptjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { db, queries, UPLOADS_DIR } from './db.js';

const PASSWORD = '123456';

const PEOPLE = [
  { name: 'Ana Restrepo',   gender: 'mujer',  city: 'Medellin',     bio: 'Amante del cafe y las caminatas de montana.',        interests: 'senderismo, cafe, fotografia', color: '#f97316' },
  { name: 'Carlos Mendez',  gender: 'hombre', city: 'Bogota',       bio: 'Programador de dia, guitarrista de noche.',          interests: 'musica, videojuegos, codigo',  color: '#3b82f6' },
  { name: 'Lucia Prieto',   gender: 'mujer',  city: 'Cali',         bio: 'Bailo salsa desde los 5 anos. Busco parceros.',      interests: 'salsa, viajes, cocina',        color: '#ec4899' },
  { name: 'Diego Salazar',  gender: 'hombre', city: 'Barranquilla', bio: 'Fanatico del futbol y del sancocho de mi abuela.',   interests: 'futbol, cocina, playa',        color: '#22c55e' },
  { name: 'Valeria Ortiz',  gender: 'mujer',  city: 'Cartagena',    bio: 'Disenadora. Colecciono atardeceres y libros.',       interests: 'diseno, lectura, arte',        color: '#a855f7' },
  { name: 'Mateo Guzman',   gender: 'hombre', city: 'Pereira',      bio: 'Ciclista de fin de semana, ingeniero entre semana.', interests: 'ciclismo, cerveza, tecnologia', color: '#0ea5e9' },
  { name: 'Sara Camacho',   gender: 'mujer',  city: 'Bucaramanga',  bio: 'Veterinaria. Si tienes perro, ya somos amigos.',     interests: 'animales, running, series',    color: '#ef4444' },
  { name: 'Julian Rios',    gender: 'hombre', city: 'Manizales',    bio: 'Cocino mejor de lo que juego tejo. Retame.',         interests: 'cocina, tejo, cine',           color: '#14b8a6' },
];

/** Genera un avatar SVG con las iniciales para no depender de imagenes externas. */
function makeAvatar(name, color) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const file = `seed-${name.toLowerCase().replace(/\s+/g, '-')}.svg`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${color}"/><stop offset="100%" stop-color="#111827"/>
  </linearGradient></defs>
  <rect width="600" height="800" fill="url(#g)"/>
  <text x="300" y="430" font-family="Segoe UI, Roboto, sans-serif" font-size="200"
        font-weight="700" fill="rgba(255,255,255,.92)" text-anchor="middle">${initials}</text>
</svg>`;
  writeFileSync(join(UPLOADS_DIR, file), svg, 'utf8');
  return `/uploads/${file}`;
}

function randomBirthdate(minAge, maxAge) {
  const age = minAge + Math.floor(Math.random() * (maxAge - minAge + 1));
  const year = new Date().getFullYear() - age;
  const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
  const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const hash = bcrypt.hashSync(PASSWORD, 10);
let created = 0;

for (const p of PEOPLE) {
  const email = `${p.name.split(' ')[0].toLowerCase()}@foroamigos.com`;
  if (queries.userByEmail.get(email)) continue;

  queries.insertUser.run(
    p.name, email, hash, randomBirthdate(19, 34), p.gender, 'todos',
    p.bio, p.city, p.interests, makeAvatar(p.name, p.color),
  );
  created++;
}

const total = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
console.log(`Perfiles de prueba creados: ${created} (total en la base: ${total})`);
console.log(`Puedes entrar con cualquiera de estos correos y la contrasena "${PASSWORD}":`);
for (const p of PEOPLE) console.log(`  - ${p.name.split(' ')[0].toLowerCase()}@foroamigos.com`);
