# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## PedagoDIA App

### Web App (`artifacts/web`)
React + Vite web app (PedagoDIA Web) at `/web/` path. Full-featured classroom management for teachers via browser.

- **Auth**: JWT-based login/register; token stored in `localStorage` as `pedagogia_token` / `pedagogia_teacher`
- **Pages**: Login (`/web/login`), Register (`/web/register`), main layout with 4 tabs
- **Tabs**: Chamada (daily attendance), Diário (diary/notes), Atividades (activities + delivery tracking), Relatórios (per-student reports with charts)
- **Theme**: Warm coral/orange primary (`hsl(15 85% 60%)`), Nunito (body) + Outfit (display fonts)
- **Routing**: Wouter with base `/web`, auto-redirect to login on 401
- **API client**: `src/lib/api.ts` — calls `/api` (absolute path, shared Replit proxy domain)
- **State**: TanStack Query for all data fetching + cache invalidation
- **Charts**: Recharts `PieChart` for attendance/activity percentages in reports
- **Animations**: `tw-animate-css` + custom `animate-slide-up` keyframe
- **Layout**: Sidebar on desktop (md+), bottom nav on mobile

### Mobile App (`artifacts/mobile`)
Expo React Native app (PedagoDIA) for classroom management. Features multi-teacher authentication with isolated data per teacher.

- **Auth**: JWT-based login/register via API; token stored in AsyncStorage
- **Screens**: Login (`(auth)/login`), Register (`(auth)/register`), Chamada (index), Diário, Atividades, Relatórios
- **Context**: `AuthContext` (auth state + token), `AppContext` (data fetching via API)
- **API client**: `utils/api.ts` — uses `EXPO_PUBLIC_DOMAIN` env var for base URL
- **Routing**: Unauthenticated → `/(auth)/login`, Authenticated → `/(tabs)`
- **Logout**: Button in Chamada screen header
- **Data isolation**: All data filtered by `teacherId` from JWT

### API Server (`artifacts/api-server`)
Express 5 API with JWT auth. All data routes require Bearer token.

- **Auth routes**: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- **Protected routes**: `/api/students`, `/api/activities`, `/api/attendance`, `/api/subjects`, `/api/deliveries`
- **Auth**: `bcryptjs` (password hashing), `jsonwebtoken` (JWT, 30d expiry), `requireAuth` middleware
- **JWT_SECRET**: Set in shared environment variables

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

## Generating the Android APK (EAS Build)

The mobile app is configured for EAS Build. The `artifacts/mobile/eas.json` has three profiles (`development`, `preview`, `production`) — all set to `buildType: "apk"` and all pre-configured with `EXPO_PUBLIC_DOMAIN=workspace--kukasnunes.replit.app` so the APK calls the live production API automatically.

### Steps to build the APK

> **Important**: All EAS commands must be run from inside the `artifacts/mobile` folder. Running them from the repo root will not work correctly.

1. **Create a free account** at [expo.dev](https://expo.dev) if you don't have one.
2. **Install EAS CLI** on your local machine:
   ```
   npm install -g eas-cli
   ```
3. **Log in** to your Expo account:
   ```
   eas login
   ```
4. **Navigate to the mobile folder** and link the project to your Expo account (first time only):
   ```
   cd artifacts/mobile
   eas build:configure
   ```
5. **Build the production APK** (must be run from inside `artifacts/mobile`):
   ```
   cd artifacts/mobile
   eas build --platform android --profile production
   ```
6. Wait 10–20 minutes for the build to complete (runs in Expo's cloud).
7. **Download the `.apk`** from your [Expo builds dashboard](https://expo.dev/builds) and install it on any Android device.

> **Production domain**: `workspace--kukasnunes.replit.app`  
> Verified via deployment logs — `/api/healthz` responds 200 and all API routes are active.  
> The `eas.json` with all profiles lives at `artifacts/mobile/eas.json` (the root-level `eas.json` has been removed to avoid confusion).
