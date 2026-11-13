# IIMCIP Programme Management OS

Interactive front-end prototype for IIMCIP leadership presentations.

**Positioning:** An Integrated Programme Operating System for Startup Incubation and Acceleration.

## Stack

- Next.js App Router (`output: 'export'`) · React · TypeScript strict · Tailwind
- lucide-react · Recharts · zustand + immer · date-fns · idb-keyval
- Vitest (unit) · Playwright (e2e demo script)

Front-end only. No backend, Supabase, real auth, email, payments, or external APIs/CDN assets.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Static export:

```bash
npm run build
npm run start:static
```

## Verify (gates)

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

## 20-minute leadership demo

Presenter safety net: **Data Manager → type `RESET` → Reset demo data**.

| # | Min | Role | Action |
|---|---|---|---|
| 1 | 0–2 | Leadership | Dashboard: 6 programmes, ₹ budget, verified spend, delays, risks |
| 2 | 2–3 | Leadership | Filter category = Incubation; open a programme |
| 3 | 3–7 | PM | New programme → Incubation template → edit blocks |
| 4 | 7–9 | PM | Timeline: nudge/drag a bar → Accept shift |
| 5 | 9–10 | PM | Budget: over-allocation blocked; unallocated visible |
| 6 | 10–11 | PM→Leadership | Submit → Approve → Active |
| 7 | 11–14 | PM | Activity workspace: delay + expenses + evidence |
| 8 | 14–15 | Finance | Queue: verify one, reject one with remark |
| 9 | 15–16 | Leadership | Dashboard numbers updated live |
| 10 | 16–17 | Leadership | Release report to client |
| 11 | 17–18 | Client | Released-only view; no money / internal remarks |
| 12 | 18–19 | MarCom | Events, approved media, startup wins |
| 13 | 19–20 | Leadership | Reports → Leadership Summary → PDF / CSV |

Automated: `npm run test:e2e` runs `tests/e2e/demo-script.spec.ts` plus responsive checks at 1280 / 1024 / 768.

## Performance notes

- Portfolio selectors are smoke-tested at **60 programmes × 500 activities** (`tests/unit/perf/scale-smoke.test.ts`, &lt; 2s).
- Interactive Gantt remains most comfortable at **≤ ~50 activities per programme**; larger programmes still load, but drag/zoom may feel heavier.

## Keyboard & a11y polish

- Global `:focus-visible` ring; buttons and nav links reinforce the same outline.
- Skip link → `#main-content`.
- Sidebar collapses below 1024px behind a menu toggle.

## Milestone status

| Milestone | Status |
|---|---|
| M0 Scaffold | Done |
| M1 Store & seed | Done |
| M2 Shell & roles | Done |
| M3 Rules & selectors | Done |
| M4 Data Manager | Done |
| M5 Templates & wizard | Done |
| M6 Gantt | Done |
| M7 Execution | Done |
| M8 Finance | Done |
| M9 Dashboards | Done |
| M10 Reports | Done |
| M11 Lifecycle & startups | Done |
| M12 Polish & demo-readiness | Done |

Blueprint source of truth: Project store `docs/prototype-blueprint/`.
