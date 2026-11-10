# TaskFlow API

Base URL: `http://localhost:5000/api`. JSON in, JSON out. Body limit 10 KB. CORS allows only `CLIENT_ORIGIN`.
Every response carries an `x-request-id` header.

## Envelopes

```jsonc
// success
{ "success": true, "message": "…", "data": …, "meta": { … } }   // meta only on GET /tasks
// error
{ "success": false, "message": "…", "errors": [{ "field": "title", "message": "…" }] }   // errors only on validation
```

## Task object

The only shape ever returned. `_id` and `__v` are never exposed.

```json
{
  "id": "6af2d753310171784ae78d4e",
  "title": "Ship MERN assignment",
  "description": "",
  "priority": "High",
  "status": "Pending",
  "dueDate": "2026-11-15T00:00:00.000Z",
  "createdAt": "2026-11-10T08:35:31.980Z",
  "updatedAt": "2026-11-10T08:35:31.980Z"
}
```

| Field | Rules |
|---|---|
| `title` | required string, trimmed, 3–80 chars |
| `description` | optional string, trimmed, ≤ 500, default `""` |
| `priority` | `Low` \| `Medium` \| `High` (case-sensitive), default `Medium` |
| `status` | `Pending` \| `In Progress` \| `Completed` (case-sensitive), default `Pending` |
| `dueDate` | optional, `"YYYY-MM-DD"` (stored as UTC midnight) or ISO datetime with `Z`/offset; `null` clears; past dates allowed; impossible dates (`2026-02-30`) rejected |

Unknown body fields are rejected (400, field named). `id`, `_id`, `createdAt`, `updatedAt` and `__v` count as unknown.

## Endpoints

### `POST /tasks` → 201 "Task created successfully"
```http
POST /api/tasks
{ "title": "Ship MERN assignment", "priority": "High", "dueDate": "2026-11-15" }
```
`data`: Task. Errors: 400 validation / unknown field / malformed JSON, 413 body too large.
```json
{ "success": false, "message": "Validation failed", "errors": [{ "field": "foo", "message": "Unknown field" }] }
```

### `GET /tasks` → 200 "Tasks fetched successfully"
Query (all optional; empty string = not set): `status`, `priority`, `search` (trimmed, ≤ 80, literal, case-insensitive partial title match), `page` (≥ 1, default 1), `limit` (1–100, default 20). Filters combine with AND. Sorted newest first (`createdAt` desc, `_id` desc).
```http
GET /api/tasks?search=mern&status=Pending&priority=High&limit=5
```
```json
{ "success": true, "message": "Tasks fetched successfully", "data": [ /* Task */ ],
  "meta": { "page": 1, "limit": 5, "total": 1, "totalPages": 1 } }
```
No match is `200` with `data: []`, `meta.total: 0`. Errors: 400 for invalid enum, page/limit out of range or non-integer, repeated keys (`?status=a&status=b`), bracket keys (`?status[$ne]=x`), unknown keys.

### `GET /tasks/:id` → 200 "Task fetched successfully"
`data`: Task. Errors: 400 "Invalid task id", 404 "Task not found".

### `PUT /tasks/:id` → 200 "Task updated successfully"
Full replace. Same body rules as POST (title required). Omitted optional fields reset to defaults (`description: ""`, `dueDate: null`, `Medium`, `Pending`).
`data`: Task. Errors: 400 invalid id (checked before the body), 400 validation, 404.

### `PATCH /tasks/:id/status` → 200 "Task status updated successfully"
Body: exactly `{ "status": "Completed" }`. Any other field → 400.
`data`: Task (with new `updatedAt`). Errors: 400, 404.

### `DELETE /tasks/:id` → 200 "Task deleted successfully"
`data`: `{ "id": "…" }`. Hard delete. A second delete of the same id → 404.

## Status codes

| Situation | Status | Message |
|---|---|---|
| malformed `:id` (not 24-hex) | 400 | `Invalid task id` (before body validation and DB) |
| well-formed `:id`, no task | 404 | `Task not found` |
| body/query validation, unknown field | 400 | `Validation failed` + `errors[]` |
| malformed JSON | 400 | `Malformed JSON body` |
| body > 10 KB | 413 | `Request body is too large` |
| unknown route | 404 | `Route not found: <METHOD> <url>` |
| database unreachable | 503 | `Database unavailable, please try again later` (immediate; `bufferCommands: false`) |
| anything else | 500 | `Internal server error` in production, no stack |
