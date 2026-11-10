# TaskFlow: Mini Task Manager (MERN)

```
taskflow/
├── server/   Express + Mongoose API (Jest + Supertest)
│   ├── src/{config,controllers,middleware,models,routes,services,utils,validators}
│   ├── src/constants/  shared enums, limits, messages, status codes
│   ├── docs/API.md     endpoint contract
│   ├── requests.http   VS Code REST Client examples
│   ├── src/app.js      app only (importable by tests)
│   ├── src/server.js   DB connect + listen
│   └── tests/          in-memory MongoDB helpers + tests
└── client/   Vite + React 19 + Tailwind v4 + TanStack Query (Vitest + RTL)
    └── src/{components/{ui,tasks},constants,hooks,schemas,services,utils,test}
```

## Run
```bash
cp server/.env.example server/.env     # set MONGO_URI (local Mongo or Atlas)
npm run install:all
npm run dev:server                      # http://localhost:5000
npm run dev:client                      # http://localhost:5173 (proxies /api)
npm test                                # server + client tests
```

## Logging
The API uses a zero-dependency logger (`server/src/utils/logger.js`). Every response gets one log line with its request ID, method, URL, status, duration and the *shape* of the body (keys, `success`, `message`, `errors` count, `data` type/length/keys). Bodies are never logged in full. Fields named like `password`, `token`, `authorization` or `cookie` are redacted. Strings longer than 2048 characters are truncated.

| Env var     | Values                                         | Default                                         |
|-------------|------------------------------------------------|-------------------------------------------------|
| `LOG_LEVEL` | `error`, `warn`, `info`, `debug`, `silent`     | `debug` (development), `info` (production), `silent` (test) |
| `NODE_ENV`  | `development`, `production`, `test`            | readable lines unless `production` (JSON lines) |

Level by status: 5xx → `error`, 4xx → `warn`, otherwise `info`. Each response returns an `x-request-id` header. A safe incoming ID is reused, otherwise a UUID is generated.

```
# development
2026-11-10T09:00:00.000Z INFO  request completed {"requestId":"3f1c…","method":"GET","url":"/api/health","status":200,"durationMs":1.42,"response":{"keys":["success","message"],"success":true,"message":"TaskFlow API is running"}}
# production
{"timestamp":"2026-11-10T09:00:00.000Z","level":"warn","message":"request completed","requestId":"3f1c…","method":"GET","url":"/api/nope","status":404,"durationMs":0.8,"response":{"keys":["success","message"],"success":false,"message":"Route not found: GET /api/nope"}}
```

## Status
- [x] Project skeleton, centralized error handling, health route
- [x] Centralized logger + per-response structure logging (request IDs)
- [x] Task model (title/description/priority/status/dueDate, timestamps)
- [x] Request validation (Zod, strict schemas, `req.validated`)
- [x] Task REST API: create, list (filter/search/paginate), get, replace, update status, delete
- [x] Backend test suite (Jest + Supertest + in-memory MongoDB)
- [x] Frontend UI: list, create, edit, delete, inline status, search, filters, pagination
- [x] Frontend test suite (Vitest + RTL, API mocked)

## Assumptions
- **Title**: trimmed first, then 3–80 chars; whitespace-only fails. Required on POST and PUT.
- **Description**: optional, trimmed, ≤ 500, default `""`.
- **Enums** are case-sensitive (`high` → 400). Defaults: priority `Medium`, status `Pending`.
- **Due date**: optional/nullable. `YYYY-MM-DD` (stored as UTC midnight) or an ISO datetime with `Z` or an offset (converted to UTC). Datetimes without a timezone are rejected (ambiguous). Impossible dates (`2026-02-30`) fail. `null` clears. **Past dates are allowed.**
- **Unknown fields → 400** naming the field. `id`, `_id`, `createdAt`, `updatedAt`, `__v` are never writable. Unknown *query* keys are rejected too (so `?_=cachebust` gets a 400).
- **PUT is a full replace**: omitted optional fields reset to defaults (`dueDate → null`). **PATCH /:id/status** accepts only `{ status }`.
- **Duplicate titles are allowed. Deletes are hard deletes.**
- **List**: newest first (`createdAt` desc, `_id` desc tie-break). Empty string = no filter. Search is trimmed, ≤ 80, regex-escaped, case-insensitive partial title match. Filters AND together. Repeated/bracket query keys → 400. No match is 200 with `[]`.
- **Malformed `:id`** (anything but 24 hex chars, including 12-char strings Mongoose would accept) → 400 before body validation or any DB call.
- **DB down** → 503 immediately (`bufferCommands: false`), not after Mongoose's 10 s buffer timeout.
- Updates use `findByIdAndUpdate` with `returnDocument: 'after'` (Mongoose 9's replacement for the deprecated `new: true`) and `runValidators: true`, with a whitelisted `$set`.
- **Frontend**: dates are displayed in UTC (no off-by-one). "Overdue" = due day before the viewer's local today and status not Completed (due *today* is not overdue). Page size is 10. Search text is sent as typed (server trims/escapes); whitespace-only sends nothing. Status changes save inline (select disabled while saving, reverts on failure). A 404 on edit/status/delete means the task was deleted elsewhere: toast + refetch. 502/503/504, timeouts and no response all show "Can't reach the server".
- Logging: client errors (4xx) are logged as `warn` by the response logger; the error handler only adds a `debug` line for them. Stack traces are logged for 5xx outside production only.
