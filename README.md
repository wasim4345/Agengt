# IIMCIP Programme Management OS

Interactive front-end prototype for IIMCIP leadership presentations.

**Positioning:** An Integrated Programme Operating System for Startup Incubation and Acceleration.

## Stack

- Next.js App Router (`output: 'export'`) · React · TypeScript strict · Tailwind
- lucide-react · Recharts · zustand + immer · date-fns · idb-keyval
- Vitest (unit) · Playwright (e2e scaffolding)

Front-end only. No backend, Supabase, real auth, email, payments, or external APIs/CDN assets.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verify (M0 gate)

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Static output lands in `out/`. Serve it with:

```bash
npm run start:static
```

## Milestone status

| Milestone | Status |
|---|---|
| M0 Scaffold (tokens, UI primitives, formatters) | Done |
| M1 Store & seed | Done |
| M2 Shell & roles | Done |
| M3+ Rules, modules | Not started |

Blueprint source of truth lives in the Project store under `docs/prototype-blueprint/`.
