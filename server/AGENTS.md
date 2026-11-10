# Backend AGENTS.md — Express + MongoDB Standards

## Stack
Node.js, Express, MongoDB/Mongoose. Auth (if present): JWT or HttpOnly cookies; bcrypt/Argon2. Add no framework or infrastructure without clear need.

## Structure
```
src/
  config/       env + DB setup (single source)
  constants/    enums, status codes, messages, limits
  routes/       endpoints + middleware wiring
  controllers/  HTTP in/out only
  services/     business logic (only if complex/reused)
  models/       schemas, indexes
  middleware/   auth, validation, errors
  validators/   request schemas
  utils/        genuinely reusable helpers
tests/
```

## Rules
- **No hardcoding:** enums, limits, messages, status codes and magic strings live in `constants/`. Models, validators and tests import the same values.
- **DRY/KISS:** reuse existing helpers, middleware and utils before writing new ones. No layer without real value.
- **API:** REST verbs, correct status codes, consistent `{ success, message, data }`. Filter, search, sort and paginate via query params.
- **Validation:** check params, query and body; reject unknown fields; whitelist fields (no mass assignment); escape search input.
- **Errors:** centralized handler, async wrapper, no stack traces in production, never swallow exceptions.
- **Mongoose:** schema validation, indexes for real queries, `.lean()` for reads, select only needed fields, handle invalid ObjectIds and missing docs, avoid N+1.
- **Auth:** hash passwords, verify ownership, never trust client `userId`, never return secrets.
- **Security:** Helmet, explicit CORS, rate-limit sensitive routes, secrets in env.
- **Quality:** async/await, small focused functions, remove dead code and unused dependencies, document API/schema changes.

## Testing
Cover success, failure, validation, auth/ownership and DB edge cases. Add a regression test for every fixed bug.

## Before Completing
Run tests, lint and build. Review queries, error handling and auth.
