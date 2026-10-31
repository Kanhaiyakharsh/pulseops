# PulseOps

Phase 1 of PulseOps: a production-oriented TypeScript monorepo. It contains a React frontend, an Express API, shared Zod schemas, and Docker Compose for MongoDB and Redis. No AI agents yet; this phase is the foundation they will be built on.

## Stack

| Area      | Choice                                                                            |
| --------- | --------------------------------------------------------------------------------- |
| Frontend  | React 19, Vite 7, TypeScript                                                      |
| Backend   | Express 5, TypeScript, Mongoose, ioredis, pino (structured logs), helmet, cors    |
| Shared    | `@pulseops/shared`: Zod schemas, inferred types and constants (TypeScript source) |
| Infra     | Docker Compose: MongoDB 7 and Redis 7.4, both with auth and health checks         |
| Quality   | ESLint 9 (typed), Prettier, strict TypeScript, Vitest, GitHub Actions CI          |
| Packaging | npm workspaces                                                                    |

## Repository layout

```
pulseops/
├── frontend/                 React + Vite status console
│   └── src/{components,hooks,lib,config}
├── backend/                  Express API
│   └── src/
│       ├── config/           Zod env validation, .env loading
│       ├── lib/              logger, errors, Mongo and Redis clients, validation helpers
│       ├── middleware/       request logger, 404, centralized error handler
│       ├── modules/health/   health service and routes
│       ├── routes/v1.ts      everything under /api/v1
│       ├── app.ts            createApp(): builds the Express app, no I/O
│       └── server.ts         bootstrap, connections, graceful shutdown
├── packages/shared/          schemas and types used by both sides
├── infrastructure/           docker-compose.yml (MongoDB, Redis)
├── tests/                    unit/ (schemas), e2e/ (running stack), scripts/verify-stack.ts
├── scripts/setup-env.mjs     creates .env from .env.example
├── .env.example              single env file for backend, frontend and Compose
├── eslint.config.js  .prettierrc.json  tsconfig.base.json
└── .github/workflows/ci.yml
```

## Prerequisites

- Node.js 20.19+ or 22 (see `.nvmrc`) and npm 10+
- Docker with Compose v2 (`docker compose version`)

## Setup

```bash
npm install          # installs all workspaces
npm run format       # one-time: normalises formatting, then commit the lockfile
npm run dev          # creates .env if missing, starts MongoDB + Redis, then backend + frontend
```

`npm run dev` runs `setup` (creates `.env`), `infra:up` (starts containers and waits until they are healthy), and `dev:apps` (backend and frontend together).

| Service  | URL                                                                                  |
| -------- | ------------------------------------------------------------------------------------ |
| Frontend | http://localhost:5173                                                                |
| API      | http://localhost:4000/api/v1                                                         |
| Health   | http://localhost:4000/api/v1/health                                                  |
| MongoDB  | `mongodb://pulseops:pulseops_dev_password@localhost:27017/pulseops?authSource=admin` |
| Redis    | `redis://:pulseops_dev_password@localhost:6379`                                      |

The frontend proxies `/api` to the backend in development, so the browser only talks to port 5173.

## Verify the stack

With `npm run dev` running in one terminal:

```bash
npm run verify       # human-readable PASS/FAIL report
npm run test:e2e     # same checks as Vitest assertions
curl -s localhost:4000/api/v1/health
```

`verify` checks: backend liveness, backend readiness, the MongoDB ping, the Redis ping, that unversioned routes return 404, that the frontend dev server serves `index.html`, and that the frontend proxy reaches the API.

Expected health response:

```json
{
  "status": "ok",
  "service": "pulseops-backend",
  "version": "0.1.0",
  "environment": "development",
  "uptimeSeconds": 42,
  "timestamp": "2026-10-31T10:00:00.000Z",
  "checks": {
    "mongodb": { "status": "up", "latencyMs": 3.4 },
    "redis": { "status": "up", "latencyMs": 0.9 }
  }
}
```

## Scripts

| Command                                     | What it does                                                   |
| ------------------------------------------- | -------------------------------------------------------------- |
| `npm run dev`                               | setup + infrastructure + backend + frontend                    |
| `npm run dev:apps`                          | backend + frontend only (infra already running)                |
| `npm run dev:backend` / `dev:frontend`      | one app only                                                   |
| `npm run build`                             | backend bundle (`backend/dist`) and frontend (`frontend/dist`) |
| `npm run lint` / `lint:fix`                 | ESLint with type-aware rules                                   |
| `npm run format` / `format:check`           | Prettier                                                       |
| `npm run typecheck`                         | `tsc --noEmit` in every workspace                              |
| `npm test`                                  | unit tests in backend, frontend and `tests/`                   |
| `npm run test:e2e` / `verify`               | checks against the running stack                               |
| `npm run infra:up` / `down` / `ps` / `logs` | manage MongoDB and Redis                                       |
| `npm run infra:reset`                       | stop containers and delete their data volumes                  |

Run the compiled backend with `npm run build && npm run start -w @pulseops/backend`.

## Configuration

All variables live in one root `.env` (copied from `.env.example`). The backend validates them with Zod at startup and exits with a list of every problem if anything is missing or malformed.

| Variable                                                                    | Used by  | Default                 | Notes                                  |
| --------------------------------------------------------------------------- | -------- | ----------------------- | -------------------------------------- |
| `NODE_ENV`                                                                  | backend  | `development`           | `development`, `test` or `production`  |
| `HOST`, `PORT`                                                              | backend  | `0.0.0.0`, `4000`       |                                        |
| `LOG_LEVEL`                                                                 | backend  | `info`                  | `fatal` to `trace`, or `silent`        |
| `CORS_ORIGINS`                                                              | backend  | `http://localhost:5173` | comma-separated list                   |
| `MONGODB_URI`                                                               | backend  | required                | `mongodb://` or `mongodb+srv://`       |
| `REDIS_URL`                                                                 | backend  | required                | `redis://` or `rediss://`              |
| `SHUTDOWN_TIMEOUT_MS`                                                       | backend  | `10000`                 | forced exit after this long on SIGTERM |
| `MONGO_ROOT_USERNAME`, `MONGO_ROOT_PASSWORD`, `MONGO_DB_NAME`, `MONGO_PORT` | Compose  | see file                | keep in sync with `MONGODB_URI`        |
| `REDIS_PASSWORD`, `REDIS_PORT`                                              | Compose  | see file                | keep in sync with `REDIS_URL`          |
| `VITE_API_BASE_URL`                                                         | frontend | `/api/v1`               | only `VITE_*` values reach the browser |
| `API_PROXY_TARGET`                                                          | Vite     | `http://localhost:4000` | dev and preview proxy target           |

The passwords in `.env.example` are for local development only. Use real secrets from your secret manager in any shared environment.

## Architecture notes

**API versioning.** Everything is mounted under `/api/v1` (`API_PREFIX` in `@pulseops/shared`). Unversioned paths return 404. A future `/api/v2` is a second router next to `routes/v1.ts`.

**Health checks.** `GET /api/v1/health/live` answers 200 while the process runs and never touches dependencies (use it for liveness). `GET /api/v1/health` pings MongoDB and Redis with a 2 second timeout each and returns 200, or 503 with the same payload if either is down (use it for readiness). Raw dependency error messages are only included outside production.

**Error handling.** Throw `AppError` subclasses (`NotFoundError`, `ValidationError`, ...) from anywhere; Express 5 forwards rejected promises automatically. One `errorHandler` converts everything into this envelope. Unknown errors become a generic 500, and their details go to the log only.

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "requestId": "7f0c...",
    "details": [{ "path": "name", "message": "Required", "code": "invalid_type" }]
  }
}
```

Use `parseWith(schema, req.body)` in handlers to validate input with Zod and get a typed result or a 400.

**Logging.** pino with one JSON line per request in production and pretty output in development. Every request has an id (an inbound `x-request-id` is honoured), returned as a response header and in error bodies. `authorization` and `cookie` headers are redacted. The liveness probe is not logged.

**Lifecycle.** The server connects to MongoDB and Redis before listening and exits non-zero if it cannot. SIGINT and SIGTERM stop accepting requests, close idle connections, disconnect both databases, then exit; a timer forces exit if that takes too long.

**Shared package.** `@pulseops/shared` is consumed as TypeScript source, so there is no build step to keep in sync. Vite and `tsx` read it directly, and `tsup` bundles it into the backend output.

**Path aliases.** `@/*` maps to `src/*` in `frontend` and `backend`. `@pulseops/shared` resolves through the workspace link and is also mapped in each `tsconfig.json`. Vite, Vitest and tsx pick these up from the tsconfig via `vite-tsconfig-paths` and native support.

**TypeScript.** `tsconfig.base.json` enables `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns`, `noUnused*` and `verbatimModuleSyntax`.

## Troubleshooting

- **`npm run infra:up` fails with "env file not found".** Run `npm run setup` first.
- **Port 27017 or 6379 already in use.** Change `MONGO_PORT` or `REDIS_PORT` in `.env` and update `MONGODB_URI` / `REDIS_URL` to match.
- **Backend exits with "Invalid environment configuration".** The message lists each bad variable. Compare with `.env.example`.
- **Backend exits on startup with a MongoDB or Redis error.** Check `npm run infra:ps` shows both as `healthy`. If you changed a password after the first start, run `npm run infra:reset` once, because the MongoDB root user is only created on first boot.
- **Frontend shows "The API is not responding".** The backend is not running, or `API_PROXY_TARGET` points at the wrong port. Restart `npm run dev` after editing `.env`.
- **Port 5173 in use.** Vite is configured with `strictPort`, so it fails rather than moving; free the port or change it in `frontend/vite.config.ts`.

## Not in Phase 1

AI agents, authentication, background job queues, application Dockerfiles, and deployment manifests. Redis and MongoDB are connected and monitored but hold no application data yet.
