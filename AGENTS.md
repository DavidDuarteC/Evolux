# AGENTS.md — Evolux (PP-Source)

## Stack
- React 19 + Vite 7 (plain JSX, **no TypeScript**)
- TailwindCSS 3 (custom CSS variables for theming, dark mode by default)
- Supabase (Postgres + Auth + RLS) — primary backend
- react-router-dom v6, react-hook-form + zod, Framer Motion, Recharts, Sonner

## Commands
```
npm run dev       # Vite dev server
npm run build     # production build → dist/
npm run lint      # ESLint (flat config, eslint.config.js)
npm run preview   # Vite preview of built output
npm test          # Vitest (run once) — verifies Supabase tables + calculations
npm run test:watch # Vitest in watch mode
```
- No `typecheck` (no TS). No CI.

## Architecture

### Entry & Routing
- `src/main.jsx` → mounts React tree with `BrowserRouter > AuthProvider > App`; `AuthProvider` imported from `features/auth/context/`
- `src/App.jsx` → wraps app in `ThemeProvider > UserProvider > FinanceProvider > TaskProvider > MonthlyTrackerProvider > AppRoutes`
- Auth guard: if not authenticated, redirects to `/auth`; shows spinner while loading
- Authenticated users get tab-based navigation (`currentTab` switch in AppRoutes) inside `MainLayout` + `Sidebar`
- All feature modules and contexts imported from `src/features/{feature}/`, not `src/modules/` or `src/context/`

### Backends (two)
1. **Supabase** — primary. Client in `src/shared/services/supabase.js`, feature data layers in `src/features/*/services/`. All tables use RLS scoped to `auth.uid() = user_id`.
2. **Google Apps Script** — secondary/legacy. `src/shared/services/api.js` uses `no-cors` mode and always returns `{ success: true }` (opaque response). Individual wrappers in old `src/services/` were deleted — only `api.js` is kept.

### State Management
- React Context for everything: `AuthContext`, `FinanceContext`, `TaskContext`, `MonthlyTrackerContext`, `ThemeContext`, `UserContext`, `ToastContext`
- Feature-specific contexts (`AuthContext`, `FinanceContext`, `TaskContext`, `MonthlyTrackerContext`) live in `src/features/{feature}/context/`
- App-wide contexts (`ThemeContext`, `UserContext`, `ToastContext`) live in `src/context/`
- `zustand` is in `package.json` but **not used** anywhere in the codebase

### Directory Map
### Directory Map
| Path | Purpose |
|------|---------|
| `src/features/*/` | Feature folders (auth, finance, monthlyTracker, tasks, goals, fitness, profile, dashboard) |
| `src/features/finance/components/` | Modular tabs: `IncomeExpensesTab.jsx` (Ingresos y Gastos), `LiquidityTab.jsx` (Liquidez) |
| `src/features/*/context/` | Feature-specific React Context providers (Auth, Finance, Task, MonthlyTracker) |
| `src/features/*/services/` | Feature-specific Supabase data access (one per table) |
| `src/features/*/hooks/` | Feature-specific custom hooks |
| `src/features/*/utils/` | Feature-specific utilities |
| `src/shared/components/` | Shared UI components (`StatCard`, `DatePicker`, `CalendarInput`, `ConfirmDialog`, `ColorPicker`, etc.) |
| `src/shared/hooks/` | Shared custom hooks |
| `src/shared/services/` | Shared services: `supabase.js` (client init), `api.js` (Google Apps Script) |
| `src/shared/lib/` | `constants.js` (statuses, types, months, theme colors), `validation.js` (Zod schemas) |
| `src/layout/` | MainLayout + Sidebar |
| `src/context/` | App-wide React Context providers (Theme, User) |
| `src/hooks/` | Custom hooks (only `useAuth.js` — re-exports from auth feature) |
| `sql/` | `supabase_schema.sql` (canonical DB schema with RLS), `migration_monthly_tracker.sql`, `migration_wise.sql`, `migration_profiles_wise.sql`, `migration_profiles_targets.sql` |
| `tests/` | Vitest tests — `db-tables.test.js` (Supabase table verification), `tracker-calculations.test.js` (calculation tests) |
| `supabase/functions/` | Edge Functions — `get-wise-rate/` (fetches Wise mid-market rate + fee from Wise API, 1-min cache) |

## Key Gotchas

### Auth
- Supabase Auth with email/password + Google OAuth
- `AuthContext` has a **10-second timeout** — forces `loading=false` if Supabase doesn't respond
- On first login, profiles are auto-created via DB trigger (`handle_new_auth_user`) and also fallback-inserted in `AuthContext.fetchProfile()`

### Finance / Transactions
- **status values**: `0` = pending (gray), `1` = paid/completed (green), `2` = error (red)
- **Totals only count status=1 items** — this applies to stat cards, section footers, and trend calculations
- `FinanceContext.loadData()` auto-creates a default account named "Principal" with amount 0 if no accounts exist
- Currency formatting uses Colombian locale: `$X.XXX` (dots as thousands separators)
- Dates: frontend uses "Mes DD" format (e.g. "Ene 15"), database uses "YYYY-MM-DD"
- **Finance.jsx** is modularized into 2 tabs:
  1. `IncomeExpensesTab.jsx`: Ingresos Fijos (Wise deposits/withdrawals + Manual COP/USD), Gastos Anuales, Gastos Fijos y Gastos Variables. Section buttons ("Copiar mes anterior" y "Limpiar") trigger a `ConfirmModal` popup with selectable items. Items are sorted by date on the frontend.
  2. `LiquidityTab.jsx`: Wallet items (actual money accounts, pending income, debts).
- **Profile.jsx** has a Wise toggle (`profiles.use_wise`) that shows/hides the Wise section in Finance → Ingresos. When off, only Manual COP/USD input is shown.
- **Dashboard.jsx** is the single central hub for Analytics & History. Multi-bar chart compares **Ingresos vs Gastos Fijos vs Gastos Variables vs Ahorro** with range selectors (3M, 6M, 1A), expense donut chart, CDT/Colchón accumulated savings area chart, task/habit rates, financial goals progress, and registered months history.

### Calendar Input
- `CalendarInput.jsx` uses `React.createPortal` attached to `document.body` with fixed viewport positioning and window scroll/resize listeners to prevent clipping inside `.glass-card` (`overflow: hidden`). Styled using theme CSS variables (`bg-[var(--bg-card-solid)]`, `text-[var(--text-primary)]`, `border-[var(--border-card)]`).

### Monthly Tracker
- Feature folder: `src/features/monthlyTracker/` (context + services, UI lives in `src/features/finance/components/IncomeExpensesTab.jsx`)
- Tracks monthly income (Wise EUR→COP or manual COP), fixed/variable expenses, savings/cushion percentages, and monthly history.
- Tables: `monthly_budgets`, `monthly_fixed_expenses`, `monthly_variable_expenses`, `wise_deposits`, `wise_withdrawals` (see `sql/supabase_schema.sql`, `sql/migration_monthly_tracker.sql`, `sql/migration_wise.sql`).
- `monthly_budgets.income_mode` can be `'wise'` (default) or `'manual'`. When `'manual'`, `manual_income_cop` is used instead of the Wise EUR→COP conversion.
- **Wise mode with partial withdrawals**: `wise_deposits` tracks EUR arriving to Wise (global, accumulates across months). `wise_withdrawals` tracks each conversion (per month, each with its own rate and fee). COP = sum of `cop_received` from month's withdrawals. Saldo Wise = total deposits - total withdrawn (amount + fee). If no withdrawals exist, COP falls back to legacy calculation `(salary_eur - wise_fee_eur) * exchange_rate`.
- Sensitive fields are encrypted via `src/shared/lib/crypto.js` (added `monthly_budgets`, `monthly_fixed_expenses`, `monthly_variable_expenses`, `wise_deposits`, `wise_withdrawals` to `SENSITIVE_FIELDS`).
- All encrypted columns use `TEXT` type (not `NUMERIC`) because encryption produces JSON strings.

### Goals
- `handleTransaction()` receives `amount` that may be a **number** (from `parseInt`) or **string** (from input). Always wrap with `String(amount).replace(...)` before parsing — see `src/features/goals/Goals.jsx:167`

### Database
- `saveHabits()` does a **full delete-then-insert** (not upsert) — be careful if adding foreign keys to habits
- `addInlineHabit()` in Fitness first calls `createHabit()` (INSERT) then `syncHabits()` calls `saveHabits()` (DELETE + INSERT) — can cause `duplicate key violates unique constraint "habits_pkey"`; prefer using `syncHabits` directly with the full updated array
- `TaskContext.loadData()` auto-creates a default space "Principal" with 3 default categories ("Por Hacer", "En Progreso", "Terminado") if no spaces exist — mirror pattern of `FinanceContext.loadData()`
- `updateTask` in TaskContext converts `categoryId` (camelCase from form) to `category_id` (snake_case for DB). Any new fields added to the task form must follow this pattern
- All database calls in `src/features/*/services/` enforce `user_id` filtering on every query
- Schema must match `sql/supabase_schema.sql` — run it in Supabase SQL editor when setting up

### Theme
- Dark mode is the default via CSS: `.dark, :root:not(.light)` applies dark theme
- Toggling light mode adds the `light` class to `<html>` (see `ThemeContext`)
- All colors are CSS custom properties defined in `src/index.css`
- Fonts loaded from Google Fonts: Poppins, Inter, Space Mono

### Validation
- Forms use `react-hook-form` with `@hookform/resolvers` + Zod
- Shared Zod schemas and `validateForm()` utility are in `src/shared/lib/validation.js`

### Constants
- All shared constants in `src/shared/lib/constants.js`: `TRANSACTION_STATUS` (0/1/2), `TRANSACTION_TYPE` (income/expense), `FINANCE_SECTIONS`, `MONTHS_SHORT`, `MONTHS_LONG`, `THEME_COLORS`
- Use these instead of magic values when adding features
