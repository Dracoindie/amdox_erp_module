# web — AMX-ERP-2026 frontend

Next.js 16 (App Router) dashboard. See the [root README](../../README.md) for setup.

- `app/(dashboard)/` — module pages; the layout checks the session with `/auth/refresh` and `/auth/me`. If the API can't be reached, it shows a "can't reach the server" screen instead of signing the user out.
- `components/ui/` — the design system (see below)
- `components/charts/` — lazily loaded charts (Recharts), legends, bar lists and data-table fallbacks
- `lib/auth.ts` — in-memory session store (no tokens in localStorage)
- `lib/axios.ts` — API client: CSRF header, single-flight token refresh, 422 field errors
- `lib/useApi.ts` — `useApi` (GET with loading/error state) and `useMutation` (pending state, field errors, toasts)
- `lib/theme.ts` — light / dark / system theme, applied before first paint
- `lib/format.ts` — money, date and number formatting. Currency and locale come from `NEXT_PUBLIC_CURRENCY` / `NEXT_PUBLIC_LOCALE` (default `USD` / `en-US`; for rupees use `INR` / `en-IN`).
- `mocks/` — Mock Service Worker handlers, only active with `NEXT_PUBLIC_USE_MOCKS=true`

## Design system

Colours, surfaces and text are semantic tokens defined once in `app/globals.css`: `bg-canvas`, `bg-surface`, `bg-surface-2`, `border-line`, `text-fg`, `text-fg-muted`, `text-fg-subtle`, `bg-primary`, `text-success`, `bg-danger-soft`, and so on. Dark mode redefines the tokens, so components need no `dark:` variants. Don't use raw hex colours or Tailwind palette colours in components.

| Component | Use |
|---|---|
| `Button`, `IconButton` | variants primary / secondary / ghost / danger; `loading` shows a spinner and blocks repeat clicks; `IconButton` requires `aria-label` |
| `Form`, `Field`, `Input`, `Select`, `Textarea`, `SearchInput` | `Form` shows validation errors next to each field (client checks and API 422 errors) and ignores double submits. `Field` wires up the label, hint and error. `Input` takes a `prefix` (currency) or `icon`. |
| `Card`, `StatCard`, `DescriptionList`, `PageHeader` | layout; use `Card flush` for edge-to-edge tables |
| `DataTable`, `Pagination` | sortable columns (server or client), numbers right-aligned in tabular figures; rows become stacked cards below `md` |
| `Tabs`, `TabPanel`, `useTabParam` | accessible tabs; the active tab lives in `?tab=` |
| `Modal`, `useConfirm` | native `<dialog>`: traps focus, closes on Escape, restores focus. `useConfirm()` asks before irreversible actions. |
| `useToast` | success and error feedback (an aria-live region) |
| `DataState`, `Skeleton*`, `EmptyState`, `ErrorState`, `Alert`, `Badge` | loading, empty, error and status UI |

## Commands

```bash
pnpm --filter web dev            # http://localhost:3000
pnpm --filter web check-types
pnpm --filter web lint
pnpm --filter web test:e2e       # Playwright smoke test; needs API + web running and a seeded DB (WEB_URL to override)
pnpm --filter web ui:capture     # screenshots of every page, role, width and theme → ui-audit/after
```
