# web — AMX-ERP-2026 frontend

Next.js 16 (App Router) dashboard. See the [root README](../../README.md) for setup.

- `app/(dashboard)/` — module pages; the layout guards the session via `/auth/refresh` + `/auth/me`
- `lib/auth.ts` — in-memory session store (no tokens in localStorage)
- `lib/axios.ts` — API client: CSRF header, single-flight token refresh
- `lib/useApi.ts` — data fetching with loading / error / empty states
- `components/ui.tsx` — shared UI kit
- `mocks/` — Mock Service Worker handlers, only active with `NEXT_PUBLIC_USE_MOCKS=true`

```bash
pnpm --filter web dev          # http://localhost:3000
pnpm --filter web check-types
pnpm --filter web lint
```
