# Frontend AGENTS.md — React Standards

## Stack
React (JS or TS per existing config), Vite, React Router, Tailwind CSS, Axios or the existing API client, TanStack Query for server state when needed. No Next.js or SSR.

## Structure
```
src/
  components/   reusable UI (ui/ = primitives)
  pages/        route-level screens
  hooks/        data + logic hooks
  services/     API client + endpoint functions
  constants/    enums, messages, limits, routes, config
  utils/        pure helpers
  test/
```

## Rules
- **No hardcoding:** statuses, priorities, limits, messages, routes, URLs and design values live in `constants/` or theme config. Mirror backend enums from one shared constants file.
- **Reuse first:** search existing components, hooks and utils before creating new ones. Extend them via props rather than duplicating.
- **DRY/KISS:** abstract only on genuine reuse; keep files small and single-purpose.
- **Components:** functional, one responsibility, logic in hooks, no giant JSX or conditionals.
- **State:** local first; Context only when shared; TanStack Query for server state (never copy it); no Redux without need; no `useEffect` for derivable values.
- **React:** stable keys, never mutate state, `useMemo`/`useCallback` only for real benefit.
- **Styling:** Tailwind with centralized tokens, mobile-first, semantic HTML, accessible labels.
- **States:** always handle loading, empty, error and success.
- **Forms:** validate with reusable schemas, clear messages, disable while submitting, backend stays the authority.
- **API:** all calls via `services/`; never in components; handle 401 consistently.
- **Security:** no secrets in code, no unsafe HTML, prefer HttpOnly cookies over localStorage tokens.

## Testing
Test forms, filters, confirmations, error and loading states. Mock the service layer.

## Before Completing
Check all UI states, responsiveness, console errors, API integration. Run lint, tests and build.
