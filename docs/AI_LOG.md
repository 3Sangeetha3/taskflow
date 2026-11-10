# AI development log

Tool: Claude Code (Claude Opus 5.5). Date: 2026-11-10. Each entry records the prompt, the tests, the results before and after, the bugs found, and one piece of AI code that was rejected or changed.

---

## 1. Centralized logger

**Prompt (summary):** Zero-dependency logger (`error|warn|info|debug`, level from `LOG_LEVEL`, else by `NODE_ENV`: debug/info/silent), JSON lines in production and readable lines in development. A response-logging middleware replaces morgan and logs the response *shape* (keys, success, message, errors count, data type/length/keys), never full bodies. It also redacts `password|token|authorization|cookie`, truncates long values, sets the level by status (5xx error, 4xx warn), and adds a request ID header and log field. All `console.*` calls are replaced.

**Tests:** `server/tests/logger.test.js` (21 tests). Covers level resolution and filtering, JSON and pretty formats, deep redaction, truncation, object/array/error structure summaries, warn on 4xx and error on 5xx, request ID generation, reuse and rejection, and stack in errorHandler logs except in production. Tests spy on logger methods or use an injected sink, so nothing reaches the real console.

**Results:** 24/24 with the health tests. A live dev server showed one 200 (info), one 404 (warn) and one malformed-JSON 400 (warn) line, each with its request ID.

**Changed after review:** The first version attached stack traces to the error handler's debug line for *every* error. The live 404 and 400 lines then carried ~10 frames of Express/body-parser internals, which is noise for client errors. Now only 5xx errors log a stack, and never in production.

---

## 2. Task data model + backend architecture (test-first)

**Prompts:** two overlapping prompts (the second supersedes the first). Flow: Route → Validate (Zod, strict) → Controller → Service → Model. `req.validated` instead of reassigning `req.query` (Express 5.3.0 makes it a read-only getter). Exact "… successfully" messages, a 12-case required list, contract tests (envelopes, no `_id`/`__v`, CORS, idempotent delete), `bufferCommands: false`, 413/503 mapping, docs and curl verification.

**Tests written first** (all import their limits, enums and messages from `src/constants`):

| File | Tests | Focus |
|---|---|---|
| `tasks.api.test.js` | 97 | required 12, validation edge cases via HTTP, filters/search/pagination, concurrency |
| `tasks.contract.test.js` | 18 | exact envelopes and messages for all 6 endpoints, Task shape, ISO dates, unknown fields on POST/PUT/PATCH, wrong Content-Type, CORS, DELETE twice |
| `task.validator.test.js` | 120 | every Zod rule directly (boundaries, types, dates, unknown keys, query params) |
| `task.service.test.js` | 10 | `escapeRegex`, `buildTaskFilter`, `listTasks` (meta, stable order under identical `createdAt`) |
| `errors.test.js` | 17 | malformed JSON, 413, 404 route, DB down → 503 in < 1 s then reconnect, production never leaks stack or Mongo internals, error envelope |

### Results before and after

| Run | Result | Verdict |
|---|---|---|
| RED #1 | 114 failed, ~580 s, 456 "Exceeded timeout" | **wrong reason:** `beforeAll(db.connect)` hit Jest's 5 s hook timeout |
| RED #2 (hook timeout raised) | 132 failed, still 228 timeouts | **wrong reason:** see bug 1 |
| RED #3 | 114 failed / 42 passed in 2.5 s. 79 assertions received **501** (controller stubs); 2 suites failed on missing `taskValidator` / `escapeRegex` | **right reason** |
| GREEN #1 | 278/281 | 3 failures exposed bug 2 |
| GREEN #2 | **286/286** (incl. 3 health + 21 logger) | done |

### Bugs found and fixed

1. **In-memory MongoDB never connected under Jest** (pre-existing; `tests/setup.js` had never been exercised). The error was `MongoServerSelectionError: Missing required sub-document 'driver' in the client metadata document`. Root cause: MongoDB driver 7.8 loads its `os` adapter via a dynamic `await import('os')` (`runtime_adapters.js`). Jest's CommonJS VM rejects dynamic `import()`, so the driver sent an empty handshake document and mongod 8.2 refused it. Fix: `connectDB(uri, overrides)` accepts extra driver options, and the test helper passes `runtimeAdapters: { os }`. Production code is unchanged. Covered by every DB test.
2. **Duplicate, misleading validation errors for arrays** (Zod 4 behavior). `title: ["abc"]` returned both "Title must be a string" *and* "Title must be 3–80 characters", because Zod 4 still runs `min`/`max` after a type failure and an array has `.length`. The same latent bug affected `description`, `search`, `page` and `limit`. Fix: a `stringThen(typeError, refine)` helper checks the type first and refines inside `.pipe()`. Regression tests: "reports a single error for an over-long array" (description) and "reports a single error for array search/page/limit".
3. **Test-infra:** the in-memory `mongod`'s first launch exceeds 5 s, so DB hooks now use `DB_HOOK_TIMEOUT_MS`.

### AI code rejected or changed (with reasoning)

- **`{ new: true }` (as specified) → `{ returnDocument: 'after' }`.** A probe showed Mongoose 9.12 prints *"the `new` option for findOneAndUpdate() is deprecated. Use `returnDocument: 'after'`"*. Same behavior, no deprecation noise, and it won't break in Mongoose 10.
- **`mongoose.isValidObjectId(id)` rejected for `validateObjectId`.** It returns `true` for *any* 12-character string (e.g. `"aaaaaaaaaaaa"`), which would slip past the 400 and reach the DB. `mongoose.isObjectIdOrHexString` accepts only 24-hex; a test covers `aaaaaaaaaaaa` on all four id routes.
- **`z.coerce.number().int()` rejected for `page`/`limit`.** `Number()` accepts `"0x10"` (16), `"1e1"` (10) and `" 2 "`. The final schema requires `^\d+$`, then `int().min(1).max(MAX)` (Zod 4 `int()` also restricts to safe integers, so `skip` can't overflow).
- **`.strict()` → `z.strictObject()`**: the Zod 4 form of the same thing (`.strict()` is legacy in v4).

### Manual verification (real `src/server.js`, in-memory MongoDB, port 5055)

create → 201 (title trimmed, dueDate `2026-11-15T00:00:00.000Z`); combined filters `search=mern&status=Pending&priority=High` → 1 result with meta; missing id → 404; `abc` → 400 "Invalid task id"; `{foo, _id}` → 400 naming both; PATCH `done` → 400; delete → 200, again → 404; `?status[$ne]=x` → 400; 11 KB body → 413.

---

## 3. Frontend (React 19 + Tailwind v4 + TanStack Query)

**Prompt (summary):** Full TaskFlow UI against the real API. Requirements: an internal-tool look (hairlines, ≤ 6px radius, one teal accent, no gradients or "AI" palettes); all colours as semantic `@theme` tokens; status/priority tone maps in `constants/ui.js`; an accessible Modal and ConfirmDialog; toasts; skeleton, empty, filtered-empty and error states; Zod form and response schemas; a normalised error matrix; 9 required tests plus edge cases.

**Installed:** tailwindcss / @tailwindcss/vite 4.3.5 (CSS-first, no `tailwind.config.js`), @tanstack/react-query 5.107 (`placeholderData: keepPreviousData`, `isPending`), zod 4.6.7, lucide-react 1.71 (v1 renamed some icons, e.g. `LoaderCircle`, `CircleAlert`; names were checked before use).

**Tests (86):** `App.test.jsx` 46 (required 9 + edge cases, `taskApi` mocked), `App.malformed.test.jsx` 3 (real `taskApi`, stub axios adapter → banner, no crash), `services/api.test.js` 13 (response guards, 400/404/413/500/502–504/network/timeout normalisation), `schemas/taskSchema.test.js` 15, `utils/date.test.js` 7, `Modal.test.jsx` 2 (labelled, focus in, Tab trap, Escape, focus return), `Toast.test.jsx` 2 (auto-dismiss, errors persist, timers cleared), `ErrorBoundary.test.jsx` 1. `test/setup.js` fails any test that logs `console.error`/`console.warn` (act warnings, state-after-unmount, key warnings).

**Results:** RED: 7 suites failed on missing modules (`AppProviders`, `Modal`, `Toast`, `ErrorBoundary`); 7 date tests passed. Honest note: the schema, API and date layer was written just before its tests, so RED for those was partial. GREEN #1: 81/86. GREEN #2: **86/86**, stable over 3 repeat runs. Lint: 0 warnings (after the fix below). `vite build`: OK.

**Bugs found and fixed**
1. *Zod 4 union messages:* an invalid due date showed Zod's default "Invalid ISO date" instead of our copy. Zod 4 reports the closest branch's own issue, so the union-level `error` was ignored. The message now lives on the `z.iso.date()` branch. Covered by "rejects dueDate %p".
2. *Fast Refresh lint warning:* `Toast.jsx` exported both a component and the `useToast` hook. The context and hook moved to `toastContext.js`.
3. Three **test** bugs (not app bugs) were fixed rather than loosened. `/Late/` also matched "Late but done", so the lookup uses the exact name. The fake server didn't persist PATCHes, unlike the real API. A raw `sleep` let the debounce update state outside `act()`.

**AI code rejected or changed**
- *Rendering a separate mobile card list next to the desktop table* (the obvious approach) was rejected. It duplicates every row in the DOM, so screen readers and tests see two copies. Now there is one `<table>` whose rows become wrapped flex rows below `md` (`block md:table`, `flex md:table-row`).
- *Resetting the page with `useEffect` when filters change* was rejected. It causes an extra request for the stale page and an extra render. The page is now **derived**: stored with the filter key it belongs to, it falls back to 1 when the key changes.
- *Status badge plus a separate select* was simplified: the inline select itself carries the tone classes, and its text is always visible, so status is never conveyed by colour alone.

**Manual verification:** Chrome extension not connected, so **no screenshots and no visual check at 375/768/1280**. Instead, a temporary jsdom walkthrough (deleted afterwards) drove the real `App` → Vite proxy (5174) → Express → in-memory MongoDB. Covered: initial list (12 tasks, 2 of 2 pages, 2 overdue badges), create with trimmed title and "Nov 15, 2026", client validation, combined search + status + priority, literal `#42` and `.*(`, pagination, edit prefill + PUT with cleared date, inline status, confirmed delete. With the backend stopped, the Vite proxy returns 502, which maps to the "Can't reach the server" banner.
