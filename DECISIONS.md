# Decisions

## M1

- **Reset exactness:** `resetToSeed` replaces state with `buildDefaultSeed(demoDate)` (preserving role/user/rule-breaking prefs) without appending an extra log row, so the payload matches the pure seed.
- **Finance selector early:** Implemented in M1 (not only M3) because integrity acceptance requires `Rep = Ver + Pen` and allocation checks.
- **Evidence blobs:** Seed stores metadata + SVG data-URL thumbs; IndexedDB blob helper is ready for M7 uploads. Tiny PDF stand-ins are metadata-only unless explicitly put via `putTextBlob`.
- **Action surface:** Full programme/activity workflows arrive in later milestones; M1 exposes data-management actions + `rawUpsert`/`rawDelete` for presenter edits and persistence demos.

## M0

- **Scaffold method:** `create-next-app@15` generated in `/tmp` and copied into `/workspace` because the workspace already contained `.git` (create-next-app refused a non-empty/non-writable root).
- **Fonts:** System font stack only; removed Geist Google fonts from the default template to honour the no-remote-fonts constraint.
- **Home page:** Temporary M0 primitive showcase at `/` until M2 shell + role homes redirect here.
- **Compact INR below ₹1 Lakh:** Falls back to full Indian grouping rather than inventing a sub-lakh compact unit.
- **Playwright:** Config and smoke scaffold only; M0 acceptance is unit tests + static build, not e2e CI.
