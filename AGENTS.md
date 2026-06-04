# AGENTS.md — Variedades Danni

## Project overview

Monorepo with two packages orchestrated via Docker Compose:

| Dir | Stack | Port | Role |
|---|---|---|---|
| `backendVD/` | Node + Express **5** + TypeScript + Prisma 7 + PostgreSQL | 4000 | REST API |
| `frontendVD/` | React 19 + Vite 7 + TailwindCSS **v4** + React Router 7 | 5173 | SPA (clients + admin) |

Docker Compose runs 4 services: `db` (Postgres 16), `api`, `frontend`, `pgadmin` (port 5050).

Root `package.json` is **not** a workspace root — it only lists a stray `tailwind` dep. All real work happens inside `backendVD/` and `frontendVD/`.

---

## Development commands

### All-in-one (Docker)
```bash
cp .env.example .env          # edit values, then:
docker compose up -d --build
docker compose logs -f api
docker compose down
```

### Backend (`backendVD/`)
```bash
npm run dev           # nodemon + ts-node (hot-reload)
npm run build         # tsc → dist/
npm start             # node dist/server.js (production)
npm test              # vitest run (unit + integration)
npm run test:watch    # vitest in watch mode
npm run test:integration  # integration tests only
npm run prisma:generate    # regenerate Prisma client
npm run prisma:migrate     # prisma migrate dev
npm run prisma:studio      # Prisma Studio UI
```

### Frontend (`frontendVD/`)
```bash
npm run dev           # Vite dev server (port 5173)
npm run build         # tsc -b && vite build
npm run lint          # eslint flat config
npm run preview       # Vite preview (production build)
```

---

## Architecture (backend)

Clean/hexagonal architecture — **manual DI** in `app.ts` (the Composition Root):

```
src/
├── domain/           entities, repository interfaces, value-objects (no deps)
├── application/      services + use cases (business logic)
├── infrastructure/   Prisma repos, email, DIAN invoice client
├── interfaces/       Express controllers, routes, middleware, validators
├── config/           env.ts, database.ts (Prisma client), seed.ts
├── server.ts         entry point (DB connect → seed → listen)
└── app.ts            Composition Root (wires everything together)
```

### Path aliases (tsconfig paths)
```ts
@config/*        → src/config/*
@domain/*        → src/domain/*
@application/*   → src/application/*
@infrastructure/*→ src/infrastructure/*
@interfaces/*    → src/interfaces/*
@utils/*         → src/utils/*
```

### Prisma 7
- `prisma.config.ts` defines the schema path and migrate URL — uses `earlyAccess: true`.
- Docker Compose overrides the CMD to use `prisma db push --accept-data-loss` with an explicit `--url`. The Dockerfile's default CMD runs `prisma migrate deploy` for production.
- Database port mapping: internal `5432` → host `5434`.

### Email templates (.hbs)
Handlebars templates in `src/infrastructure/notifications/email-templates` are **not** copied by `tsc`. The Dockerfile builder stage has a manual `cp -r` step. When adding templates locally, they are loaded from the `src/` tree at runtime (via `ts-node`/`nodemon`), so no copy is needed in dev.

---

## Testing (backend)

- Framework: **Vitest** with `globals: true` — `describe`/`it`/`expect`/`vi` are available without imports.
- Setup file: `src/__tests__/setup.ts`
- Coverage: v8 provider, 80% thresholds (70% branches).
- Integration tests: `src/__tests__/integration/`
- Unit tests: `src/__tests__/unit/`
- `src/__tests__/mocks/` contains reusable test doubles.

---

## Frontend conventions

### TailwindCSS v4
Uses `@tailwindcss/vite` plugin (not the PostCSS config from v3). Do **not** add `tailwind.config.js` — it does not exist and is not used.

Design tokens are in `@theme` block in `src/index.css`:
- **Fonts**: Poppins (headings), Inter (body), Fira Code (monospace data)
- **Brand**: `brand-pink` (#D81B60), `brand-blue` (#1565C0), `brand-gold` (#F9A825)
- **Sidebar**: `sidebar-bg` (#1E293B, dark), `sidebar-text` (#CBD5E1), `sidebar-hover` (#334155)
- **Semantic**: `text-primary`, `muted`, `success`, `warning`, `danger`, `border`

### TypeScript strictness
`tsconfig.app.json` enables: `strict`, `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax`. Unused imports/vars will fail `tsc -b`.

### Key dependencies
- **State**: Zustand (`src/stores/`)
- **Data fetching**: TanStack React Query (`src/services/`)
- **UI**: Radix UI primitives, Lucide React icons,   Recharts (charts), CVA + tailwind-merge (class utilities)
- **Routing**: React Router v7 (`src/router/index.tsx`)
- **Admin**: Shared component library in `src/components/admin/`
  - `AdminModal` — animated backdrop, Esc close, focus management, size variants
  - `AdminTable` — sticky header, skeleton rows, sort indicators, pagination
  - `AdminKpiCard` — trend arrows, progress bar, loading state
  - `AdminStatusBadge` — semantic color variants (default/info/success/warning/danger/neutral)
  - `AdminPageHeader` — page title + description + action button
  - `AdminEmptyState` — icon + message + optional CTA
  - `AdminConfirmDialog` — branded confirm/cancel dialog (replaces `window.confirm`)
  - `AdminSkeleton` — card, chart, table row, and block loading skeletons

### Vite dev quirks
- `usePolling: true` is set in `vite.config.ts` for Docker volume sync compatibility.
- Dev server binds to `0.0.0.0:5173`.

---

## Environment & secrets

- Root `.env` drives Docker Compose (database, JWT, admin seed, email SMTP, Google OAuth).
- `backendVD/.env` drives local backend dev (same vars + DIAN).
- Both have `.env.example` files. **Never commit `.env` or `.pfx` certificate files.**
- JWT uses `jsonwebtoken` with a configurable `JWT_EXPIRES_IN` (default `7d`).
- Auth includes Google OAuth (`google-auth-library`).
- Email: Brevo SMTP relay via Nodemailer.

---

## DIAN e-invoicing

- Implementation is a **STUB** while DIAN habilitation is in progress.
- `src/infrastructure/invoice/DianSoapClient.ts` and `GenerateInvoiceUseCase` are wired in but return stubbed responses in `test` environment.
- Reference: `backendVD/docs/DIAN_INTEGRATION.md`.
- Certificate `.pfx` files go in `backendVD/certs/` (git-ignored).
