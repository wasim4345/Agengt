# Changelog

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
