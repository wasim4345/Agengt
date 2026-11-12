# Decisions

## M0

- **Scaffold method:** `create-next-app@15` generated in `/tmp` and copied into `/workspace` because the workspace already contained `.git` (create-next-app refused a non-empty/non-writable root).
- **Fonts:** System font stack only; removed Geist Google fonts from the default template to honour the no-remote-fonts constraint.
- **Home page:** Temporary M0 primitive showcase at `/` until M2 shell + role homes redirect here.
- **Compact INR below ₹1 Lakh:** Falls back to full Indian grouping rather than inventing a sub-lakh compact unit.
- **Playwright:** Config and smoke scaffold only; M0 acceptance is unit tests + static build, not e2e CI.
