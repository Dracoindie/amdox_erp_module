# UI audit — AMX-ERP-2026 web app

Branch `ui-overhaul` (from `fix/review-phases`). Screenshots in `before/` (432) and `after/`.
They were captured with `apps/web/e2e/capture.mjs`, which:
- signs in as all 7 seeded roles;
- covers every page and tab at 1440 / 768 / 390 px;
- covers light and dark mode for the admin, with each other role in light mode at 1440;
- captures the modals, the notification dropdown and the forms;
- captures the loading, empty, error and API-down states (mocked at the network layer), plus the 404 page.

The same run also checks for horizontal overflow and runs axe-core (WCAG 2 A/AA). Raw results are in `before/_report.json` and `before/_report-extras.json`.

Screenshot names follow `<role>--<page>--<tab>--<theme>--<width>.png`. The non-page shots are named `modal--*`, `state--*`, `dropdown--*` and `public--*`.

**Note on the "before" full-page screenshots.** The old layout scrolls inside `<main>` (the body is `h-screen overflow-hidden`), so a "full page" screenshot only shows the first 900 px. That layout is itself issue L4.

## Measured results (before)

| Check | Result |
|---|---|
| Horizontal overflow | **48 of 48** tablet and mobile views overflow: by 116 px at 768 and by 400 px at 390. The fixed 256 px sidebar never collapses. |
| axe `color-contrast` (serious) | **210 nodes on all 24 views.** Causes: white on `#ff5a00` buttons and tabs (3.1:1), `slate-400` hint and axis text (2.6:1), and `slate-500` on `slate-800` in dark mode (3.1:1). |
| axe `svg-img-alt` (serious) | 11 nodes. The pie charts have no accessible name. |
| Console | No React warnings (keys, hydration, act). All errors are network errors from the states we provoked: 401 on wrong password, 403/500 from the mocks, and refused connections. |
| Mobile navigation | Does not exist. There is no menu button and the sidebar is always on screen. |

## Findings

Severity:
- **Critical:** the app is unusable or broken for a common case.
- **High:** a significant usability or accessibility failure.
- **Medium:** inconsistent or poor, but workable.
- **Low:** polish.

### Layout & navigation

| # | Sev | Problem | Where | Screenshot |
|---|---|---|---|---|
| L1 | Critical | The sidebar is a fixed 256 px column at every width. On a 390 px phone the content gets 134 px; text wraps one word per line and the page overflows by 400 px. | all pages | `admin--dashboard--light--mobile.png`, `state--loading--finance--light--mobile.png` |
| L2 | Critical | Modals open **behind** the sidebar on mobile (z-index). The journal-entry form is cut off and unusable. | every modal | `modal--finance-journal--dark--mobile.png` |
| L3 | High | The notification dropdown renders **behind** the page cards (the header and `main` both create z-10 stacking contexts). | header | `dropdown--notifications--light--desktop.png` |
| L4 | High | Scrolling happens inside `<main>` instead of the page. Mobile browser bars never collapse, scroll position is lost on navigation, and print and full-page capture are cut off. | layout | all `before/*` |
| L5 | High | The header always says "AMDOX ERP \| Dashboard", whatever the page, and repeats the logo next to the sidebar logo. There is no breadcrumb. | all pages | `admin--finance--general-ledger--light--desktop.png` |
| L6 | High | No mobile navigation toggle at all. | all pages | `_report.json` → missing |
| L7 | Medium | Tablet (768) still shows the full sidebar. Tables are squeezed to 4 or 5 characters per column, and numbers and dates wrap over 3 lines. | tables | `admin--finance--invoices--light--tablet.png` |
| L8 | Medium | Action buttons wrap ("New / entry") when they sit next to a search box in card headers. | ledger, directory | `admin--finance--general-ledger--light--desktop.png` |
| L9 | Medium | The tab bar wraps onto two rows on tablet and stacks vertically on mobile. The tab state is not in the URL, so reload or back resets to the first tab and tabs can't be linked to. | all module pages | `admin--finance--invoices--light--tablet.png` |
| L10 | Medium | The CRM kanban clips the "Won" and "Lost" columns with no scroll cue. Dragging only works with a pointer. | CRM pipeline | `admin--crm--sales-pipeline--light--desktop.png` |
| L11 | Medium | A decorative 500 px orange blur sits behind every page (`blur-[150px]`). It adds visual noise and an expensive paint. | layout, login | all |
| L12 | Low | `html, body { overflow-x: hidden }` hides overflow bugs instead of fixing them. | globals.css | — |
| L13 | Low | The user block in the sidebar footer can be covered by the Next.js dev indicator. In production the sign-out icon button is 32 px with only a `title`. | sidebar | all |

### Visual consistency & typography

| # | Sev | Problem | Where | Screenshot |
|---|---|---|---|---|
| V1 | High | No design tokens. There are 91 hardcoded hex values (53 × `#ff5a00`), and the dark mode is a hand-written `dark:` variant on each element, which is missed in many places. | everywhere | — |
| V2 | High | The primary brand colour fails contrast as a button background (white on `#ff5a00` is 3.1:1). The same applies to active tabs and the KPI values shown in orange. | all buttons, tabs | axe |
| V3 | Medium | The login, forgot-password and reset-password pages each use a different card radius (32 px, 24 px), button style (gradient, uppercase "ENTER SYSTEM") and input style. None of them match the app. | public pages | `public--login--light--desktop.png` |
| V4 | Medium | Seven radius values (lg, xl, 2xl, 3xl, `[32px]`, full) and nine font sizes, including 9, 10 and 11 px text, which is too small to read. | everywhere | — |
| V5 | Medium | The Geist font is loaded but never applied. The body falls back to the system font, so the app pays the font download for nothing. | layout | — |
| V6 | Medium | Page titles are `text-3xl font-extrabold` and stat values `text-3xl font-extrabold` in brand orange, competing with each other. The hierarchy is loud and flat. | all pages | `admin--dashboard--light--desktop.png` |
| V7 | Low | KPI cards colour the value itself (orange, green, red, amber) without any meaning; "Open invoices" is orange-warn and "Revenue" is orange-brand. | dashboard, BI | same |
| V8 | Low | Unused boilerplate: `app/page.module.css`, `tailwind.config.ts` (Tailwind 4 ignores it), `@source "../../packages/ui"` (the package is deleted) and the Turborepo/Vercel SVGs in `public/`. | — | — |

### Tables & data formatting

| # | Sev | Problem | Where | Screenshot |
|---|---|---|---|---|
| T1 | High | Money and quantity columns are left-aligned and not tabular, so digits don't line up. | every table | `admin--hr--payroll--light--desktop.png` |
| T2 | High | Tables become unreadable below about 900 px: no column priority and no stacked layout on phones. | every table | `admin--finance--invoices--light--tablet.png` |
| T3 | Medium | Nothing can be sorted, although the API supports `sort` and `order` on ledger, invoices, expenses, employees, products, customers, sales orders and users. | tables | — |
| T4 | Medium | The pager only appears when there is more than one page and shows "N records · page x of y". It isn't visible at the bottom of long lists. | tables | — |
| T5 | Medium | Currency is hardcoded to USD/en-US in `lib/format.ts` and can't be configured. | all money | — |
| T6 | Medium | The ledger "Lines" column crams every debit and credit line into one cell of 12 px text. | ledger | `admin--finance--general-ledger--light--desktop.png` |
| T7 | Low | Invoice and user status are changed by an inline `<select>` in the table, with no confirmation and no feedback after the change. | invoices, users | — |
| T8 | Low | Clickable forecast rows are `<tr onClick>`, which keyboard users can't reach. | AI forecast | — |

### Forms

| # | Sev | Problem | Where | Screenshot |
|---|---|---|---|---|
| F1 | High | The login inputs use placeholders as labels: they have no `<label>`, and the hint disappears once you type. Forgot and reset use `sr-only` labels. | login | `public--login--light--desktop.png` |
| F2 | High | `<Field>` wraps the input in a `<label>` but has no `id`, hint or error slot. API validation errors (422 field errors) are shown as one line at the bottom of the form, never next to the field. | all forms | `form--expense-empty-submit--light--desktop.png` |
| F3 | High | No success feedback. After saving an expense, a supplier, a customer, a budget, a status change or a payroll run, the form silently clears. | all forms | — |
| F4 | High | "Confirm payroll" (irreversible, creates payslips for everyone) runs on one click with no confirmation. The same applies to cancelling a PO or sales order and disabling a user. | HR payroll, SCM, CRM, settings | `admin--hr--payroll--light--desktop.png` |
| F5 | Medium | Submit buttons are disabled while pending, but there is no spinner, and Enter in a modal can still re-trigger the submit before the first request settles. | modals | — |
| F6 | Medium | Number inputs for money have no currency prefix, and `inputMode` is missing on mobile. | money inputs | — |
| F7 | Medium | Closing a modal keeps its half-filled values and the last error, so reopening shows stale state. | modals | — |
| F8 | Low | "Forgot password" claims "Check your email", but no email is ever sent (no provider is configured). | forgot password | `public--forgot-password--light--desktop.png` |

### States

| # | Sev | Problem | Where | Screenshot |
|---|---|---|---|---|
| S1 | Critical | **API down → the user is silently redirected to the login page** with no message, because any network failure in `restoreSession` counts as signed out. | session guard | `state--api-down--light--desktop.png` |
| S2 | High | Loading is a full-screen spinner during the session check, then "Loading…" text. There are no skeletons, so the layout jumps when data arrives. | all pages | `state--loading--dashboard--light--desktop.png` |
| S3 | Medium | The error state shows the raw API message ("Internal server error") with no title or explanation. The retry button is tiny. | all data views | `state--error--finance--light--desktop.png` |
| S4 | Medium | Empty states are one grey line with no guidance or call to action (for example "Create the first entry"). | all lists | `state--empty--finance-general-ledger--light--desktop.png` |
| S5 | Medium | The 404 page is Next's default black screen, unbranded and ignoring the theme. There is no 403 page. Tabs a role can't use show an amber "no access" card instead of being hidden. | 404, settings, SCM forecast | `state--404--dark--mobile.png` |
| S6 | Medium | No error boundary (`error.tsx`), so a render error white-screens the app. | app | — |

### Charts

| # | Sev | Problem | Where | Screenshot |
|---|---|---|---|---|
| C1 | High | Chart colours are hardcoded for light mode. Grid lines (`#E5E7EB`) glare in dark mode, the tooltip is a white box in dark mode, and the legend text is drawn in the series colour. | dashboard, BI, forecast | `admin--bi--dashboards--dark--desktop.png` |
| C2 | Medium | Ad-hoc palettes (two different 7-colour lists) whose order differs between dashboard and BI, so "Payroll" changes colour from page to page. The palette is not checked for colour-blind separation. | dashboard, BI | — |
| C3 | Medium | The current, still-running month is plotted like a complete month, so costs "drop to $0" in November. `monotone` smoothing also invents curves between monthly points. | dashboard, BI | `admin--dashboard--light--desktop.png` |
| C4 | Medium | The pie charts have no accessible name (axe `svg-img-alt`), and there is no table alternative next to any chart. | dashboard, BI | axe |
| C5 | Low | Charts with all-zero data still render empty axes instead of an empty state. | dashboard, BI | — |
| C6 | Low | The forecast tooltip shows raw floats with no units. | AI forecast | — |

### Accessibility

| # | Sev | Problem | Where |
|---|---|---|---|
| A1 | High | 210 contrast failures (see V2; slate-400 hints; dark-mode slate-500 text). |
| A2 | High | The modal has `role=dialog` but no focus trap, focus isn't moved into it or restored, Escape doesn't close it, and the page behind keeps scrolling. |
| A3 | High | Tabs have `role=tab` but no `tablist` arrow-key navigation, `aria-controls` or `tabpanel`. |
| A4 | Medium | There is no visible focus style on most controls (inputs only change border colour). There is no skip link. |
| A5 | Medium | Icon-only buttons (sign out, copy password, remove journal line) rely on `title` or are unlabeled. The unread dot uses `aria-label` on a `span`. |
| A6 | Medium | The notification dropdown isn't closable with Escape, focus isn't managed, and it has no `role`. |
| A7 | Low | The active nav link doesn't set `aria-current="page"`. |

### Dark mode

| # | Sev | Problem | Where | Screenshot |
|---|---|---|---|---|
| D1 | High | **White flash on every load.** The theme is applied in a `useEffect` after hydration, so dark-mode users see a light frame first. | all | — |
| D2 | High | The login, forgot and reset pages have no dark mode at all: a white card on a light page while the app is dark. | public | `public--login--dark--mobile.png` |
| D3 | Medium | The theme ignores the OS preference (`prefers-color-scheme`); the default is always light. | all | — |
| D4 | Medium | Many elements have no `dark:` variant: `text-slate-500` hints, badges in tables, the payroll preview colours and the chart internals. | various | `admin--bi--dashboards--dark--desktop.png` |

### Performance

| # | Sev | Problem |
|---|---|---|
| P1 | Medium | Recharts (about 100 KB gzip) is bundled into the dashboard, BI and SCM routes even when the chart tab isn't open (the SCM forecast tab, the BI report builder). |
| P2 | Low | Fonts: two variable fonts are downloaded and never used (V5). |
| P3 | Low | Each module page is one large client component; every tab's code ships up front. This is acceptable at this size and noted only. |

## Not changed (needs a decision)

- **Read access by role:** the API lets every signed-in role read every module (an EMPLOYEE can list all invoices; READ_ONLY sees the ledger). The UI mirrors the API, so the nav shows every module. Narrowing reads is a backend RBAC decision.
- **Currency:** the data is USD-like (salaries of 64k–180k a year). I made the currency configurable (`NEXT_PUBLIC_CURRENCY`, `NEXT_PUBLIC_LOCALE`), defaulting to USD. Switching to ₹ is a one-line env change, but the seed amounts would then read as rupees.
