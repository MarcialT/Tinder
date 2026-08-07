# Foro Amigos — People Finder (Proyecto #3)

Aplicacion movil para conocer amigos: registro con foto, deslizar perfiles a izquierda o
derecha, y chat en vivo con imagenes por WebSockets.

- **App movil:** Ionic 8 + Angular 20 (componentes standalone, signals) + Capacitor
- **Backend:** Node.js + Express + Socket.IO + SQLite (`node:sqlite`) + JWT

## Requisitos cubiertos

| Requisito del enunciado | Donde esta |
|---|---|
| Inicio de sesion | `mobile/src/app/pages/login`, `backend/src/routes/auth.routes.js` |
| Registro completo con imagen de perfil | `mobile/src/app/pages/register` (multipart con la foto) |
| CRUD de perfil | `mobile/src/app/pages/profile` — leer, editar datos, cambiar foto, cambiar contraseña y eliminar cuenta |
| Aceptar/rechazar deslizando izquierda o derecha | `mobile/src/app/pages/discover` (gesto con pointer events) |
| Chat con WebSockets en vivo | `backend/src/realtime.js`, `mobile/src/app/core/socket.service.ts` |
| Persistencia de mensajes y chats | Tablas `matches` y `messages` en `backend/src/db.js` |
| Envio de imagenes por el chat | `POST /api/chats/:id/images` + burbuja de imagen con visor |

Extras: sello visual "AMIGOS / PASO" al arrastrar, deshacer el ultimo descarte, indicador de
"escribiendo...", confirmacion de lectura (doble check), estado en linea, contador de mensajes
sin leer, aviso emergente al conseguir una nueva amistad, historial paginado y selector de
intereses por categorias predefinidas con buscador (`mobile/src/app/shared/interests-picker`).

## Como ejecutarlo

Se necesita **Node.js 22.5 o superior** (el backend usa el modulo `node:sqlite` incorporado).

### 1. Backend

```bash
cd backend
npm install
npm run seed     # opcional: crea 8 perfiles de prueba (contraseña 123456)
npm start        # queda escuchando en http://localhost:3000
```

Al arrancar imprime tambien la IP de la red local; esa es la que se usa desde un celular.

### 2. App movil

```bash
cd mobile
npm install
npm start        # http://localhost:8100
```

Para entrar rapido tras correr `npm run seed`: **ana@foroamigos.com / 123456**.

Para probar el chat en vivo abre dos navegadores distintos (uno en ventana normal y otro en
incognito) e inicia sesion con dos cuentas diferentes; por ejemplo `ana@foroamigos.com` y
`carlos@foroamigos.com`. Cuando ambos se acepten aparecera la conversacion en la pestana Amigos.

### 3. Compilar para Android (opcional)

```bash
cd mobile
# apunta environment.ts a la IP de tu maquina, por ejemplo http://192.168.1.15:3000
npm run build
npx cap add android
npx cap sync
npx cap open android
```

> El celular y el computador deben estar en la misma red WiFi. La configuracion de Capacitor ya
> permite trafico en claro (`cleartext: true`) porque el backend de desarrollo va por http.

## Estructura

```
backend/
  src/
    server.js            arranque de Express + Socket.IO
    db.js                esquema SQLite y consultas preparadas
    auth.js              JWT y middleware de autenticacion
    realtime.js          eventos de WebSocket (chat, presencia, matches)
    uploads.js           subida de imagenes con multer
    seed.js              perfiles de prueba
    routes/              auth, users, social (swipes/matches) y chat
  uploads/               fotos de perfil y del chat
  data/                  base de datos SQLite

mobile/src/app/
  core/                  modelos, servicios (auth, social, socket), guard e interceptor
  pages/
    login/  register/    autenticacion
    tabs/                navegacion inferior
    discover/            mazo de tarjetas deslizables
    matches/             lista de amistades y conversaciones
    chat/                conversacion en tiempo real
    profile/             CRUD del perfil propio
```

## API

| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | `/api/auth/register` | Registro (multipart, campo `photo`) |
| POST | `/api/auth/login` | Inicio de sesion |
| GET | `/api/auth/me` | Revalidar la sesion guardada |
| GET/PUT/DELETE | `/api/users/me` | CRUD del perfil |
| PUT | `/api/users/me/photo` | Cambiar la foto |
| PUT | `/api/users/me/password` | Cambiar la contraseña |
| GET | `/api/discover` | Perfiles pendientes por decidir |
| POST | `/api/swipes` | Aceptar (`like`) o rechazar (`pass`) |
| DELETE | `/api/swipes/:id` | Deshacer el ultimo descarte |
| GET | `/api/matches` | Amistades con su ultimo mensaje |
| DELETE | `/api/matches/:id` | Eliminar una amistad |
| GET | `/api/chats/:id/messages` | Historial paginado |
| POST | `/api/chats/:id/messages` | Enviar texto (respaldo REST) |
| POST | `/api/chats/:id/images` | Enviar una imagen |
| POST | `/api/chats/:id/read` | Marcar como leidos |

### Eventos de WebSocket

El cliente se conecta enviando el JWT en `auth.token`.

| Evento | Direccion | Descripcion |
|---|---|---|
| `chat:join` / `chat:leave` | cliente → servidor | Entrar o salir de una conversacion |
| `chat:send` | cliente → servidor | Enviar mensaje (responde con el mensaje guardado) |
| `chat:message` | servidor → cliente | Mensaje nuevo en tiempo real |
| `chat:typing` | ambos | Indicador de "escribiendo..." |
| `chat:read` | ambos | Confirmacion de lectura |
| `match:new` / `match:removed` | servidor → cliente | Amistad creada o eliminada |
| `presence` | servidor → cliente | Un amigo se conecto o desconecto |
