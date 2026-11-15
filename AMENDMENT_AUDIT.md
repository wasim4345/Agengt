# Amendment 10 — Audit (before changes)

Factual inventory of `/workspace` as of branch `cursor/m15-roles-portfolio-intelligence-935f` (tip includes M14 doc 09). Cite paths only; no code changes yet in this document’s scope.

---

## 1. Inventory

| Area | What exists | Evidence |
|---|---|---|
| Framework | Next.js **15.5.29** App Router, React 19, TypeScript strict, Tailwind 4, static export | `package.json`, `next.config` |
| Folder structure | `src/app`, `components`, `hooks`, `lib`, `seed`, `selectors`, `store`, `types`; `tests/unit`, `tests/e2e` | repo root |
| State store | Zustand + immer; `Result<T>` actions; undo patches | `src/store/store.ts` |
| Persistence | `localStorage` key `iimcip-os:v1:state`; snapshots `iimcip-os:v1:snapshots`; IndexedDB blobs via `idb-keyval` | `src/types/domain.ts` `STORAGE_KEYS`; `src/store/persist.ts`, `src/store/files.ts` |
| Schema | `CURRENT_SCHEMA_VERSION = 2`; `SEED_VERSION = "2.1.0"`; `migrate()` in `src/store/migrations.ts` | domain + migrations |
| Navigation | `navConfig.ts` role homes + sidebar; `RoleGate`; root redirects to `ROLE_HOME` | `src/lib/navConfig.ts`, `src/components/RoleGate.tsx`, `src/app/(shell)/page.tsx` |
| Role switcher | `RoleSwitcher` / `PersonaSwitcher` in header | `src/components/layout/RoleSwitcher.tsx`, `Header.tsx` |
| Roles today | `leadership \| programme_manager \| client \| marcom \| finance` | `src/types/domain.ts` |
| Routes | 24 `page.tsx` under `(shell)`: leadership, manager, client/*, marcom/*, finance/*, programmes/*, templates, timeline, approvals, startups, reports, log, data | `src/app/(shell)/**` |
| Dashboards | Leadership, Manager, Client, MarCom, Finance (+ BudgetVsCostPanel) | `src/components/dashboards/*` |
| Programme workspace | Tabs: overview, activities, timeline, deps, budget, lifecycle, template | `src/app/(shell)/programmes/view/page.tsx`, `src/components/programme/*` |
| Activity workspace | Tabs: overview, update, expenses, evidence, history, deps; BudgetStrip; Event photos | `src/components/execution/*` |
| Gantt / deps | Interactive Gantt + impact panel | `src/components/gantt/*`, `src/lib/rules/dependencies.ts` |
| Finance | Budgets, expenses, verify/reject, revisions, closure; finance-only verify today | `src/store/actions/finance.ts`, `src/lib/rules/expense.ts`, `src/selectors/finance.ts` |
| Reports | Reports centre, 7 catalogue IDs, PDF/CSV | `src/selectors/reports.ts`, `src/components/reports/*` |
| Evidence / photos | Evidence grid + doc 09 EventPhotosSection + IndexedDB | `src/components/execution/EventPhotosSection.tsx`, `src/lib/eventPhotos.ts` |
| Templates / wizard | Templates page + programme new wizard | `src/app/(shell)/templates`, `programmes/new` |
| Seed | 8 programmes, 15 users, offices, KPIs, startups, demo traps | `src/seed/**` |
| Import/export | Data Manager JSON + scenarios/snapshots | `src/components/data/*`, `src/store` |
| Demo / presenter | Demo clock, allowRuleBreaking, Data Manager on all roles | `DemoClock`, Control Centre / Data Manager |
| Design tokens | Navy / brand-red / status colours; system fonts | `src/app/globals.css`, UI primitives |
| Intelligence | **None** — no `selectors/intelligence.ts`, no Institutional route, no FY classifier | search |

### Seed users (roles)

| ID | Role | Name |
|---|---|---|
| `usr_meera`, `usr_chairman` | leadership | Director / Chairman |
| `usr_arjun`, `usr_kavya`, `usr_rohit` | programme_manager | PMs |
| `usr_sunita` | finance | Finance Lead |
| `usr_priya` | marcom | MarCom |
| `usr_rahul`… (8) | client | Sponsor contacts |

### Programme model gaps vs Amendment 10

- Has `managerId`, `teamIds`, `clientId`, `officeId`, status, dates, `totalBudget`
- **Missing:** `leadId`, `completedAt`
- No `insightStates` / `insightRuns` / `settings.intelligence`

### Programme statuses in seed (demo date 2026-11-12)

- Active: P1–P4, P6; Completed: P5 (Maruti); Draft: P7; Pending: P8 — good FY demos with light backfill

---

## 2. Classification table (§2–§9)

| Item | Status | Evidence | Action |
|---|---|---|---|
| **§2 Four roles** (`leadership`, `programme_lead`, `programme_manager`, `marcom`) | Conflicting | `Role` union includes `finance`/`client`; switcher/nav/gates/seed | Modify union; add `programme_lead`; remove finance/client from switcher/nav; migrate |
| Role display names (CEO & Board, Programme Lead, …) | Partial | `ROLE_LABELS` outdated names | Modify labels |
| Permission matrix (Lead verifies; Manager submits; MarCom no finance) | Conflicting | `verifyExpense` finance-only (`EXP_VERIFY_ROLE`); finance queue routes | Extend rules + move queue UX to Lead/Leadership; keep dormant client selectors |
| `Programme.leadId` | Missing | `Programme` interface | Add + seed (2 leads) + migration |
| Schema migrate finance→lead, client deactivate | Missing | `migrations.ts` v2 only | Bump schema; map roles |
| MarCom no budget/cost/surplus/remarks | Partial | `selectors/marcom.ts` + leak tests; still may need audit after role change | Extend leak tests / strip any remaining keys |
| **§3 FY selector** Indian FY + `?fy=` | Missing | Leadership filters: category/client/office/manager/status/from–to only (`leadershipFilters.ts`) | Add FY helpers + URL param |
| `classifyProgramme` Completed/Ongoing/Upcoming | Missing | No classifier | Add pure fn + unit tests; wire dashboards |
| Portfolio metrics (doc 09 finance defs + D-4 toggle) | Partial | `selectors/finance.ts`, `leadership.kpis` | Extend with FY scope + spend-in-FY toggle |
| Filters: Lead filter | Missing | Filters have manager, not lead | Add lead filter |
| Portfolio table + classification chips + summary cards | Partial | Leadership table exists; no FY class chips | Extend existing LeadershipDashboard |
| PM/Lead reuse same table scoped | Partial | ManagerDashboard separate, lighter | Extend/reuse portfolio table component |
| **§4 Three workspace layers** A/B/C | Missing | Flat tabs on programme view | Regroup tabs under Financials / Operational / Intelligence |
| MarCom no programme workspace | Partial | `isPathAllowed` already blocks `/programmes/*` for marcom | Retain |
| Verification only Lead/Leadership in A | Conflicting | Finance queue UI | Relocate controls; update RoleGate |
| **§5 Programme Intelligence** | Missing | No rules engine / UI | Add `selectors/intelligence.ts` + Layer C UI |
| Insight type + states + runs | Missing | Not in AppState | Add types + store actions |
| `settings.intelligence` thresholds | Missing | `meta.settings` has warnPct, requireEventPhotos, etc. | Extend settings + Data Manager editors |
| **§6 Institutional Intelligence** | Missing | No route/nav | Add `/institutional/` + Leadership-only RoleGate + `selectors/institutional.ts` |
| Sections A–E + INS-01…09 | Missing | — | Add |
| Min-sample guard | Missing | — | Add |
| **§7 Central data / integrity** | Partial | 8 integrity checks (orphans…event-photos); no intelligence refs | Add portfolio Σ + insight ref checks |
| **§8 Data model** (`InsightState`, `InsightRun`, `completedAt`) | Missing | domain.ts | Add; set `completedAt` on complete/close |
| Seed intelligence demos (delay chain, overrun, stale report, …) | Partial | Many demos exist from M7–M14; need leadId + FY-shaped dates | Extend seed |
| Expense verify: Lead portfolio / Leadership; not own submission | Conflicting | Finance-only + `submittedBy` checks may exist partially | Modify `canVerifyExpense` |
| **§9 Navigation** new labels + Institutional item | Conflicting | Current nav uses Dashboard/Timeline/Approvals/Finance paths | Modify `navConfig`; remount finance screens under Lead/Leadership financials; remove client/finance nav |

---

## 3. Smallest-change plan (files to touch)

**Do not rebuild:** Gantt, templates, wizard, expenses, reports, persistence, Data Manager, design system, dormant `selectors/client.ts`.

| Step | Files (primary) | Why |
|---|---|---|
| 2 Roles | `types/domain.ts`, `migrations.ts`, `navConfig.ts`, `RoleSwitcher.tsx`, `seed/users.ts`, `seed/*/`, `lib/rules/expense.ts`, `store/actions/finance.ts`, RoleGate pages, e2e helpers, tests | Four roles + leadId + verify permission |
| 3 Portfolio/FY | `lib/fy.ts` (new), `lib/classifyProgramme.ts` (new), `leadershipFilters.ts`, `selectors/leadership.ts`, `LeadershipDashboard.tsx`, Manager/Lead dashboards | FY + classification |
| 4 Workspace layers | `programmes/view` + programme components | Regroup tabs A/B/C |
| 5 Programme intel | `selectors/intelligence.ts`, components under `programme/intelligence`, store insight actions, settings | Rules + UI |
| 6 Institutional | `app/.../institutional/page.tsx`, `selectors/institutional.ts`, nav | Leadership-only |
| 7–8 Integrity + nav polish | `integrity.ts`, RoleGate allow lists, tests | Close gaps |
| 9 Tests | `tests/unit/lib/classifyProgramme`, intelligence, roles, migration | Required suite |

**Reuse:** Leadership dashboard (extend), finance selectors (reuse), expense verification UI (re-home from `/finance/queue`), Manager dashboard table patterns, MarCom dashboard (keep, no finance).

---

## 4. Risks

| Risk | Mitigation |
|---|---|
| Persisted localStorage with `finance`/`client` roles crashes after Role union shrink | Schema bump + migrate roles; deactivate client users; map `usr_sunita` → `programme_lead` |
| Tests/e2e hard-code `finance` / `client` / `/finance/` | Update helpers and RoleGate; redirect old paths or keep thin aliases for Lead |
| Charts/reports filter by old roles | Grep Role unions; update report catalogue visibility |
| `verifyExpense` callers assume finance persona | Update demo scripts + seed default personas |
| Intelligence false positives on thin seed | Seed thresholds + min-sample; ensure ≥3 programmes in a delayed category |
| Breaking Gantt/expense regression | Run full unit suite after each step; no architecture rewrite |

---

## 5. Decisions applied (from doc §1)

D-1…D-6 accepted as written: Lead verifies (not own); Client role removed from switcher (selectors dormant); FY classification rules; lifetime figures + FY spend toggle; `leadId`; CEO + Chairman personas under `leadership`.

---

*Next: Step 2 — Roles & permissions.*
