# SFU Project Hub (Video Submitter)

Next.js app for class submissions (links + YouTube), comments, SFU CAS and/or Google sign-in, and MongoDB.

## Sign-in

- **`/`** — student entry: join codes, submissions, class projects, and comments. Same SFU CAS / Google accounts as the instructor hub.
- **`/instructor`** — instructor entry: create classes, join codes, defaults, and moderation. Legacy **`/login`**, **`/login/student`**, and **`/login/instructor`** redirect to `/` or `/instructor`.

## Local development (`npm run dev`)

1. Copy [`.env.example`](.env.example) to `.env.local` and set at least **`AUTH_SECRET`** (`openssl rand -base64 32`).
2. **MongoDB:** leave **`MONGODB_URI` unset** to use an embedded [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server) (dev only; first start may download `mongod`). Or set `MONGODB_URI` to Atlas, `mongodb://127.0.0.1:27017/...`, etc. Set **`DISABLE_IN_MEMORY_MONGO=true`** if you want no auto DB without a URI.
3. **Google:** `ENABLE_GOOGLE=true` plus **`AUTH_GOOGLE_ID`** and **`AUTH_GOOGLE_SECRET`**. In Google Cloud Console add redirect  
   `{AUTH_URL}/api/auth/callback/google` (e.g. `http://localhost:3000/api/auth/callback/google`).
4. **CAS:** `ENABLE_CAS=true` and ensure **`AUTH_URL`** matches the registered CAS service URL.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docker (app + MongoDB)

The Compose **`app`** service uses the **production** image from the [`Dockerfile`](Dockerfile) (Next.js `output: "standalone"`), not `next dev`.

```bash
npm run docker:up
```

- Compose injects **`MONGODB_URI=mongodb://mongo:27017/videosubmitter`** (see [`docker-compose.yml`](docker-compose.yml)).
- Edit [`docker/env.docker`](docker/env.docker): set a real **`AUTH_SECRET`** (`openssl rand -base64 32`), keep **`AUTH_URL`** / **`NEXT_PUBLIC_APP_URL`** aligned with how you open the app (default `http://localhost:3000`).
- **CAS in Docker:** [`docker/env.docker`](docker/env.docker) has **`ENABLE_CAS=true`**. SFU must have registered the **exact** service URL used in ticket validation, with no trailing slash on the base: **`{AUTH_URL}/api/auth/cas/callback`**. If you use a tunnel (for example ngrok), set **`AUTH_URL`** to that origin before `docker compose up`.

```bash
npm run docker:down
```

## Scripts

| Command                                     | Purpose                |
| ------------------------------------------- | ---------------------- |
| `npm run dev`                               | Development server     |
| `npm run build` / `npm start`               | Production build / run |
| `npm run docker:up` / `npm run docker:down` | Compose stack          |
