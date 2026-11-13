# Changelog

## M10 — Reports centre (2026-11-12)

- Reports Centre `/reports`: 7 live report previews from `selectors/reports`
- Parameter bar (programme, date range, sections), A4 paper preview, "Data as of" stamp
- Export PDF via print stylesheet (`window.print`); CSV download with totals
- Client-safe *Client Programme Report* on `/reports` and `/client/reports`
- Tests: demo step 13; CSV totals equal Leadership/Finance dashboard totals

## M9 — Dashboards (2026-11-12)

- Role dashboards (Leadership / PM / Client / MarCom / Finance) use Recharts + existing selectors; no hard-coded KPI numbers
- Leadership filters persist in URL query (`category`, `client`, `manager`, `status`, `from`, `to`)
- Empty states when a widget has no rows
- **Behaviour fix:** `isOverdue` now treats an activity as overdue when demo date is *after* effective end (was inverted)

## M3 — Rules & selectors (2026-11-12)

- `lib/rules`: dependencies (cycle/schedule/impact), programme validation (E/W), report validation (RPT_*), budget, expense
- `selectors/*`: core, finance, leadership, manager, client, marcom, financeRole, reports, integrity
- `useRoleSelectors` role-scoped surface; client/MarCom leak guards
- Exhaustive unit tests; coverage ≥90% on `lib/rules` + `selectors` (npm test runs with coverage thresholds)

## M2 — Shell & roles (2026-11-12)

- App shell: Header, Sidebar, Banner, Demo clock, Role/Persona switchers, Notifications bell, global programme search
- `navConfig` drives role-specific navigation; root redirects to role home
- `RoleGate` omits forbidden page content and shows “Not available for this role”
- Role homes and nav destinations wired to live store data (thin screens; full modules later)

## M1 — Store & seed (2026-11-12)

- Domain types from doc 03 in `src/types/domain.ts`
- Zustand + immer store with `Result<T>` actions, activity log + notifications
- localStorage persistence (debounced), snapshot storage, cross-tab sync, hydration gate
- IndexedDB file blob helpers (`src/store/files.ts`) and schema migrations
- Undo via immer patches (last mutation)
- Full default seed (doc 06 §4) plus healthy / troubled / empty scenarios; Reset / Clear
- `selectors/finance.ts` money maths and `selectors/integrity.ts` all-green on default seed

## M0 — Scaffold (2026-11-12)

- Next.js App Router with static export, TypeScript strict, Tailwind, ESLint
- Design tokens from blueprint doc 05 §1 (navy/accent/status colours, system fonts)
- UI primitives: Button, Card, Badge, Tabs, Drawer, Modal, Toast, Table, Field, MoneyInput, Skeleton, EmptyState
- INR and date formatters with unit tests (`₹25,00,000`, `₹25.0 L`, `dd MMM yyyy`)
- Vitest unit harness and Playwright e2e scaffolding
