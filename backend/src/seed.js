// Carga perfiles de prueba para poder deslizar tarjetas desde el primer arranque.
// Uso:  npm run seed        (todas las cuentas usan la contraseña 123456)
import bcrypt from 'bcryptjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { db, queries, UPLOADS_DIR } from './db.js';

const PASSWORD = '123456';
const TOTAL_ACCOUNTS = 100;

// Perfiles curados, con bio propia: son los que se mencionan en el README para probar rapido.
const PEOPLE = [
  { name: 'Ana Restrepo',   gender: 'mujer',  city: 'Medellin',     bio: 'Amante del cafe y las caminatas de montana.',        interests: 'Senderismo, Café, Fotografía', color: '#f97316' },
  { name: 'Carlos Mendez',  gender: 'hombre', city: 'Bogota',       bio: 'Programador de dia, guitarrista de noche.',          interests: 'Música, Videojuegos, Tecnología', color: '#3b82f6' },
  { name: 'Lucia Prieto',   gender: 'mujer',  city: 'Cali',         bio: 'Bailo salsa desde los 5 anos. Busco parceros.',      interests: 'Baile, Viajes, Cocina',        color: '#ec4899' },
  { name: 'Diego Salazar',  gender: 'hombre', city: 'Barranquilla', bio: 'Fanatico del futbol y del sancocho de mi abuela.',   interests: 'Fútbol, Cocina, Playa',        color: '#22c55e' },
  { name: 'Valeria Ortiz',  gender: 'mujer',  city: 'Cartagena',    bio: 'Disenadora. Colecciono atardeceres y libros.',       interests: 'Arte y diseño, Lectura, Playa', color: '#a855f7' },
  { name: 'Mateo Guzman',   gender: 'hombre', city: 'Pereira',      bio: 'Ciclista de fin de semana, ingeniero entre semana.', interests: 'Ciclismo, Vino y cerveza, Tecnología', color: '#0ea5e9' },
  { name: 'Sara Camacho',   gender: 'mujer',  city: 'Bucaramanga',  bio: 'Veterinaria. Si tienes perro, ya somos amigos.',     interests: 'Mascotas, Running, Cine y series', color: '#ef4444' },
  { name: 'Julian Rios',    gender: 'hombre', city: 'Manizales',    bio: 'Cocino mejor de lo que juego tejo. Retame.',         interests: 'Cocina, Comedia, Cine y series', color: '#14b8a6' },
];

// Mismas categorias que ofrece el selector de intereses de la app movil.
const INTEREST_CATEGORIES = [
  'Música', 'Cine y series', 'Lectura', 'Fotografía', 'Viajes', 'Cocina', 'Café',
  'Arte y diseño', 'Baile', 'Fitness y gym', 'Yoga', 'Running', 'Ciclismo', 'Senderismo',
  'Fútbol', 'Videojuegos', 'Tecnología', 'Moda', 'Mascotas', 'Naturaleza', 'Playa',
  'Montaña', 'Idiomas', 'Emprendimiento', 'Voluntariado', 'Comedia', 'Anime', 'Teatro',
  'Vino y cerveza', 'Fiestas',
];

const FEMALE_NAMES = [
  'Valentina', 'Camila', 'Sofia', 'Isabella', 'Maria', 'Laura', 'Daniela', 'Gabriela',
  'Juliana', 'Manuela', 'Luisa', 'Paula', 'Carolina', 'Andrea', 'Natalia', 'Alejandra',
  'Mariana', 'Catalina', 'Victoria', 'Antonella', 'Salome', 'Emilia', 'Renata', 'Ximena',
  'Diana', 'Adriana', 'Fernanda', 'Isabela', 'Melissa', 'Angela', 'Monica', 'Patricia',
];

const MALE_NAMES = [
  'Santiago', 'Sebastian', 'Andres', 'David', 'Juan', 'Diego', 'Miguel', 'Daniel',
  'Alejandro', 'Felipe', 'Julian', 'Camilo', 'Nicolas', 'Esteban', 'Mateo', 'Samuel',
  'Tomas', 'Gabriel', 'Ricardo', 'Fernando', 'Eduardo', 'Pablo', 'Rafael', 'Ivan',
  'Cristian', 'Oscar', 'Hector', 'Marco', 'Gustavo', 'Leonardo', 'Sergio', 'Jorge',
];

const LAST_NAMES = [
  'Gomez', 'Rodriguez', 'Martinez', 'Lopez', 'Garcia', 'Perez', 'Sanchez', 'Ramirez',
  'Torres', 'Flores', 'Rivera', 'Gutierrez', 'Diaz', 'Reyes', 'Morales', 'Cruz',
  'Ortega', 'Delgado', 'Castro', 'Vargas', 'Romero', 'Alvarez', 'Jimenez', 'Moreno',
  'Munoz', 'Rojas', 'Herrera', 'Medina', 'Aguilar', 'Castillo', 'Vega', 'Suarez',
  'Contreras', 'Nunez', 'Silva', 'Pena', 'Cardenas', 'Trujillo', 'Molina', 'Cortes',
];

const CITIES = [
  'Medellin', 'Bogota', 'Cali', 'Barranquilla', 'Cartagena', 'Pereira', 'Bucaramanga',
  'Manizales', 'Santa Marta', 'Ibague', 'Villavicencio', 'Monteria', 'Neiva', 'Pasto',
  'Armenia', 'Cucuta', 'Popayan', 'Tunja', 'Sincelejo', 'Valledupar', 'Riohacha', 'Yopal',
];

const AVATAR_COLORS = [
  '#f97316', '#3b82f6', '#ec4899', '#22c55e', '#a855f7', '#0ea5e9', '#ef4444', '#14b8a6',
  '#eab308', '#8b5cf6', '#f43f5e', '#10b981',
];

const BIO_TEMPLATES = [
  (city, ints) => `Vivo en ${city} y me encanta ${ints[0]}. Si tambien te gusta ${ints[1]}, hablemos.`,
  (city, ints) => `Fan de ${ints[0]} y ${ints[1]}. ${city} es mi hogar.`,
  (city, ints) => `${city}, amante de ${ints[0]}. Buscando gente con quien compartir planes de ${ints[1]}.`,
  (city, ints) => `Me apasiona ${ints[0]}. Vivo en ${city} y siempre ando buscando planes nuevos.`,
  (city, ints) => `Entre ${ints[0]} y ${ints[1]}, asi es mi vida en ${city}.`,
  (city, ints) => `De ${city}. Los fines de semana los dedico a ${ints[0]} o a ${ints[1]}.`,
];

/** Genera un avatar SVG con las iniciales para no depender de imagenes externas. */
function makeAvatar(name, color, seedTag) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const file = `seed-${seedTag}.svg`;
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

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/** Elige `count` categorias distintas al azar. */
function pickInterests(count) {
  const pool = [...INTEREST_CATEGORIES];
  const chosen = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    chosen.push(pool.splice(idx, 1)[0]);
  }
  return chosen;
}

/** Quita tildes para dejar el correo en ASCII plano. */
function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Genera perfiles aleatorios pero realistas hasta completar el total pedido. */
function generateBulkPeople(count) {
  const people = [];
  const usedNames = new Set(PEOPLE.map((p) => p.name));

  while (people.length < count) {
    const isWoman = Math.random() < 0.5;
    const gender = Math.random() < 0.05 ? 'otro' : isWoman ? 'mujer' : 'hombre';
    const firstName = pick(isWoman ? FEMALE_NAMES : MALE_NAMES);
    const lastName = pick(LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    if (usedNames.has(name)) continue;
    usedNames.add(name);

    const city = pick(CITIES);
    const interests = pickInterests(2 + Math.floor(Math.random() * 2));
    const bio = pick(BIO_TEMPLATES)(city, interests.map((i) => i.toLowerCase()));

    people.push({
      name,
      gender,
      city,
      bio,
      interests: interests.join(', '),
      color: pick(AVATAR_COLORS),
    });
  }

  return people;
}

const ALL_PEOPLE = [...PEOPLE, ...generateBulkPeople(Math.max(0, TOTAL_ACCOUNTS - PEOPLE.length))];

const hash = bcrypt.hashSync(PASSWORD, 10);
const usedEmails = new Set();
let created = 0;

for (const p of ALL_PEOPLE) {
  const isCurated = PEOPLE.includes(p);
  let email = isCurated
    ? `${slugify(p.name.split(' ')[0])}@foroamigos.com`
    : `${slugify(p.name.split(' ')[0])}.${slugify(p.name.split(' ')[1])}@foroamigos.com`;

  // Evita choques si dos generados quedaran con el mismo nombre.slug (muy raro).
  let suffix = 1;
  while (usedEmails.has(email) || queries.userByEmail.get(email)) {
    email = `${slugify(p.name.split(' ')[0])}.${slugify(p.name.split(' ')[1] || '')}${suffix}@foroamigos.com`;
    suffix++;
  }
  usedEmails.add(email);

  queries.insertUser.run(
    p.name, email, hash, randomBirthdate(19, 34), p.gender, 'todos',
    p.bio, p.city, p.interests, makeAvatar(p.name, p.color, slugify(email.split('@')[0])),
  );
  created++;
}

const total = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
console.log(`Perfiles de prueba creados: ${created} (total en la base: ${total})`);
console.log(`Todas usan la contraseña "${PASSWORD}". Cuentas rapidas para probar:`);
for (const p of PEOPLE) console.log(`  - ${slugify(p.name.split(' ')[0])}@foroamigos.com`);
