# Task Manager: React + Express + PostgreSQL

A small full-stack CRUD app: add, edit, delete and complete tasks. It has a React frontend, a REST API built with Node.js + Express + TypeScript, and a PostgreSQL database.

**Live demo:** _coming soon_ · **API:** _coming soon_

## Features

- Responsive task list that works on phone and desktop
- Add a task (title + optional description)
- Edit a task inline (Esc cancels)
- Mark a task complete or not complete
- Delete a task (with a confirmation)
- Validation on both client and server, with clear error messages
- Loading, empty and "server unreachable" states, with a Retry button

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express 5, TypeScript, zod (validation) |
| Database | PostgreSQL 16 via `pg` (plain SQL, parameterized queries) |
| Tests | Vitest + Supertest (API, against a real Postgres), Vitest + Testing Library (UI) |
| CI | GitHub Actions: typecheck, lint, test and build on every push |
| Hosting | Vercel (frontend + API as a serverless function), Neon (Postgres) |

## Project structure

```
├─ docker-compose.yml        # local Postgres (dev + test databases)
├─ server/                   # Express API
│  ├─ api/index.js           # Vercel serverless entry point (exports the Express app)
│  ├─ vercel.json            # Vercel build + routing config for the API
│  ├─ src/
│  │  ├─ index.ts            # starts the HTTP server locally, graceful shutdown
│  │  ├─ app.ts              # builds the Express app (middleware + routes)
│  │  ├─ config.ts           # validates environment variables at startup
│  │  ├─ errors.ts           # HttpError (status + message)
│  │  ├─ db/                 # pool.ts, schema.sql, migrate.ts
│  │  ├─ middleware/         # notFound, errorHandler
│  │  ├─ scripts/migrate.ts  # `npm run db:migrate`
│  │  └─ tasks/              # task.schema.ts (zod) · task.repository.ts (SQL) · task.routes.ts (HTTP)
│  └─ tests/tasks.test.ts    # API integration tests
└─ client/                   # React app
   └─ src/
      ├─ api/tasks.ts        # typed fetch wrapper for the API
      ├─ hooks/useTasks.ts   # task state + actions
      ├─ components/         # TaskForm, TaskList, TaskItem (+ tests)
      └─ App.tsx
```

## Running locally

**Prerequisites:** Node.js 22+ and Docker.

```bash
git clone <this-repo-url>
cd fullstack-task-manager

# 1. Start Postgres (creates the tasks_dev and tasks_test databases)
docker compose up -d

# 2. API → http://localhost:4000
cd server
cp .env.example .env
npm install
npm run db:migrate
npm run dev

# 3. Frontend → http://localhost:5173 (in a second terminal)
cd client
npm install
npm run dev
```

The frontend calls `http://localhost:4000` by default. To use a different API, set `VITE_API_URL` (see `client/.env.example`).

> Already running Postgres on port 5432? Change the left side of `"5432:5432"` in `docker-compose.yml` (for example `"5433:5432"`) and use the same port in `server/.env`.

### Tests

```bash
cd server && npm test   # 32 API tests against the tasks_test database (Docker must be running)
cd client && npm test   # 11 UI and API-client tests (no server needed)
```

## Environment variables

| Where | Variable | Example | Purpose |
|---|---|---|---|
| server | `DATABASE_URL` | `postgresql://tasks:tasks@localhost:5432/tasks_dev` | Postgres connection string (required) |
| server | `PORT` | `4000` | Port to listen on (default 4000) |
| server | `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated list of frontend origins allowed to call the API |
| client | `VITE_API_URL` | `http://localhost:4000` | Base URL of the API |

Only the `.env.example` files are committed. Real `.env` files are git-ignored.

## API

Base URL: `/api`. Requests and responses are JSON.

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| `GET` | `/api/health` | none | `200 { "status": "ok" }` | `500` if the database is unreachable |
| `GET` | `/api/tasks` | none | `200 Task[]` (newest first) | `500` |
| `GET` | `/api/tasks/:id` | none | `200 Task` | `400` invalid id · `404` |
| `POST` | `/api/tasks` | `{ "title": string, "description"?: string \| null }` | `201 Task` | `400` validation |
| `PATCH` | `/api/tasks/:id` | any of `{ "title", "description", "completed" }` | `200 Task` | `400` · `404` |
| `DELETE` | `/api/tasks/:id` | none | `204` (no body) | `400` · `404` |

**Task**

```json
{
  "id": 1,
  "title": "Buy groceries",
  "description": "Milk and eggs",
  "completed": false,
  "createdAt": "2026-11-24T10:00:00.000Z",
  "updatedAt": "2026-11-24T10:00:00.000Z"
}
```

**Validation rules:** `title` is required, trimmed, and 1–200 characters. `description` is optional, up to 2000 characters, and `""` or `null` is stored as `null`. `completed` must be a boolean. Unknown fields (such as `id`) are rejected. A PATCH must include at least one field.

**Errors** always have the same shape:

```json
{
  "error": {
    "message": "Validation failed",
    "details": [{ "field": "title", "message": "Title is required" }]
  }
}
```

Other error statuses: `400` for malformed JSON, `413` for a body over 10 KB, `404` for unknown routes, and `500` with a generic message (the details are logged on the server, never sent to the client).

**Example**

```bash
curl -X POST http://localhost:4000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Buy groceries"}'

curl -X PATCH http://localhost:4000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'
```

## Database schema

One table, defined in [`server/src/db/schema.sql`](server/src/db/schema.sql):

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title       VARCHAR(200) NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT,
  completed   BOOLEAN      NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
```

| Column | Type | Notes |
|---|---|---|
| `id` | `INTEGER` identity, primary key | Assigned by Postgres |
| `title` | `VARCHAR(200)`, not null | A `CHECK` constraint rejects blank titles even if the API were bypassed |
| `description` | `TEXT`, nullable | `NULL` means no description |
| `completed` | `BOOLEAN`, not null | Defaults to `false` |
| `created_at` | `TIMESTAMPTZ`, not null | Set on insert |
| `updated_at` | `TIMESTAMPTZ`, not null | Set to `now()` on every update |

`npm run db:migrate` applies the schema. It's idempotent (`IF NOT EXISTS`), so it runs safely on every deploy.

## Design decisions

- **Layered API.** Routes only handle HTTP, `task.schema.ts` only validates, and `task.repository.ts` is the only file with SQL. Each piece can be read and tested on its own.
- **Plain SQL with `pg` instead of an ORM.** One table doesn't need an ORM, and plain SQL keeps every query visible. All values are passed as parameters (`$1`, `$2`), never concatenated, which prevents SQL injection. The PATCH query builds its `SET` clause only from a fixed whitelist of column names.
- **zod for validation.** One schema both checks the request at runtime and gives the TypeScript type. Unknown keys are rejected, so a client can't set `id` or timestamps.
- **PATCH instead of PUT.** Marking a task done sends only `{ "completed": true }`. Fields that aren't sent are left alone, and `null` explicitly clears the description.
- **One error handler.** Handlers just `throw`. Express 5 forwards errors from async handlers automatically, and a single middleware maps them to `400/404/413/500` with a consistent JSON shape.
- **Fail fast on config.** Env vars are validated at startup, so a missing `DATABASE_URL` stops the server with a clear message instead of failing on the first request.
- **`createApp()` separate from `listen()`.** Tests pass the app straight to Supertest. No port is opened and nothing is mocked: the tests run real SQL against a separate test database. The same separation lets Vercel run the app as a serverless function (`api/index.js`), while `src/index.ts` runs it as a normal server locally.
- **Server-confirmed UI updates.** The frontend updates its state from the server's response instead of guessing, so the screen always matches the database. Buttons are disabled while a request is in flight to prevent double submits.
- **Security basics.** CORS allows only the configured frontend origin, request bodies are capped at 10 KB, `x-powered-by` is disabled, 500 errors never leak internals, and secrets live only in environment variables.

## Deployment

Two Vercel projects from this one repo, plus a Neon database. All are on free tiers.

- **Database:** a Neon Postgres project (AWS US East, Ohio). I used its pooled connection string as the API's `DATABASE_URL`, since serverless functions open many short-lived connections.
- **API:** a Vercel project with root directory `server`. [`server/vercel.json`](server/vercel.json) runs `npm run build && npm run db:migrate:prod` (the migration is idempotent, so it's safe on every deploy). It routes every path to [`server/api/index.js`](server/api/index.js), which exports the Express app as a serverless function. Env vars: `DATABASE_URL` and `CORS_ORIGIN` (the frontend URL).
- **Frontend:** a Vercel project with root directory `client` (Vite is detected automatically). Env var: `VITE_API_URL` (the API URL).

Pushing to `main` redeploys both. GitHub Actions runs the tests on the same push.

## What I'd add next

- User accounts, so each person sees only their own tasks (auth + a `user_id` foreign key)
- Pagination and filtering (all / active / done) once lists get long
- Optimistic UI updates with rollback, for a snappier feel on slow connections
- Versioned migrations (e.g. node-pg-migrate) once the schema starts changing
- Rate limiting on the API

## About this project

I built this as a coding assessment and as a public code sample. I used AI assistance (Claude Code) as a pair programmer: I agreed the design first, then it was built module by module while I reviewed, tested and can explain each part.
