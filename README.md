# KalTracker

A self-hosted calorie and body measurement tracking PWA — a privacy-focused alternative to Yazio or MyFitnessPal. Runs entirely on your own infrastructure with Docker Compose.

## Features

- **Food diary** — log meals by searching the Open Food Facts database or scanning barcodes with your phone camera
- **Calorie & macro targets** — automatically calculated from your profile (height, weight, age, gender, activity level, goal); updated when body measurements change
- **Smart BMR** — uses the Katch-McArdle formula (lean body mass) when body fat % is known, giving more accurate targets for muscular body types
- **Body measurements** — track weight, body fat %, muscle %, visceral fat index, with color-coded deltas over time
- **Recipes / meals** — save multi-ingredient meals, add an optional photo, and share with other users
- **Analytics** — weekly calorie bar chart and macro progress
- **Gamification** — XP, levels, streak counter, achievement badges
- **Admin panel** — manage users, toggle admin / banned status
- **mTLS auto-login** — optional certificate-based login via Traefik (CN format: `device-username`)
- **Data export / import** — full JSON backup and restore in the profile tab
- **PWA** — installable on iOS and Android, works offline for cached pages

---

## Quick Start with Docker Compose

### Prerequisites

- Docker and Docker Compose installed
- A reverse proxy (Traefik, nginx, Caddy) for TLS termination in production — or expose port directly for local use

### 1. Clone the repository

```bash
git clone https://github.com/heeelga/calorietracker.git
cd calorietracker
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

| Variable | Description |
|---|---|
| `DB_ROOT_PASSWORD` | MariaDB root password |
| `DB_PASSWORD` | App database user password |
| `JWT_SECRET` | Random secret ≥ 32 characters |
| `ALLOWED_ORIGIN` | Your domain, e.g. `https://track.example.com` |
| `REGISTRATION_ENABLED` | `false` to lock down signups after setup |
| `MTLS_ENABLED` | `true` to enable Traefik mTLS auto-login |

Generate a strong JWT secret:
```bash
openssl rand -hex 32
```

### 3. Build and start

```bash
docker compose up -d --build
```

The app will be available on `http://localhost:3002` (or whatever `PORT` you set).

### 4. First login

Open the app and register the first user — that user automatically gets admin rights. Then set `REGISTRATION_ENABLED=false` in `.env` and restart:

```bash
docker compose restart app
```

---

## Migrating an Existing Database

If you were running the app locally (without Docker) and want to migrate your data to the Docker container:

```bash
# 1. Dump your local database
mysqldump -u root -p calorietracker > backup.sql

# 2. Copy the dump into the running container
docker cp backup.sql calorietracker-db-1:/backup.sql

# 3. Import into the container's database
docker exec -i calorietracker-db-1 \
  mysql -u calorietracker -p"$DB_PASSWORD" calorietracker < backup.sql
```

Alternatively, use the in-app **Export / Import** feature in the Profile tab to move data user by user as a JSON file.

---

## Development

### Local setup (without Docker)

Requirements: Node.js ≥ 18, MariaDB or MySQL

```bash
# Install frontend dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Create a local .env for the server
cp .env.example server/.env
# Edit server/.env with your local DB credentials

# Start the dev server (frontend + backend)
npm run dev          # Vite frontend on :5173
node server/index.js # API server on :3001
```

### Build for production

```bash
npm run build        # Outputs to dist/
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│  React 18 + Vite + TypeScript (PWA)     │
│  Tailwind CSS · @tanstack/react-query   │
└────────────────┬────────────────────────┘
                 │ REST API (/api/*)
┌────────────────▼────────────────────────┐
│  Express.js                             │
│  JWT auth · bcryptjs · express-rate-limit│
│  helmet · cors                          │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│  MariaDB (Docker volume: db_data)       │
└─────────────────────────────────────────┘
```

---

## Security Notes

- All API endpoints require a JWT bearer token (except `/api/auth/login` and `/api/auth/register`)
- Auth endpoints are rate-limited (20 req / 15 min per IP)
- General API is rate-limited (300 req / min per IP)
- Passwords are hashed with bcryptjs
- HTTP security headers are set via `helmet`
- Set `ALLOWED_ORIGIN` to your specific domain in production — do not leave as `*`
- Profile images and recipe photos are stored as base64 in the database (MEDIUMTEXT, max 5 MB per request)
- mTLS auto-login is disabled by default; only enable if you control certificate issuance

---

## Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `DB_HOST` | `db` | MariaDB hostname |
| `DB_PORT` | `3306` | MariaDB port |
| `DB_USER` | — | Database user |
| `DB_PASSWORD` | — | Database password |
| `DB_NAME` | `calorietracker` | Database name |
| `DB_ROOT_PASSWORD` | — | MariaDB root password (Docker only) |
| `JWT_SECRET` | — | Secret for signing JWTs |
| `PORT` | `3001` | HTTP port the Node server listens on |
| `ALLOWED_ORIGIN` | `*` | CORS allowed origin |
| `MTLS_ENABLED` | `false` | Enable Traefik mTLS auto-login |
| `REGISTRATION_ENABLED` | `true` | Allow new user registrations |

---

## License

MIT
