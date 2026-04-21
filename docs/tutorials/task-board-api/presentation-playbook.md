---
title: "Tutorial Presentation Playbook"
---

# Tutorial Presentation Playbook

Use this when you need to present Minima.js to developers quickly and clearly.

## 30-Second Pitch

Minima.js is a backend framework focused on fast iteration with strong structure:

- modular architecture by default (`module.ts` discovery)
- low boilerplate route wiring (`routes: Routes`)
- first-class runtime hooks for request, error, and lifespan behavior
- composable plugins for auth, CORS, OpenAPI, and operations

## 5-Minute Live Demo Flow

1. Show `src/module.ts`
   Explain: global plugins + one place for app-wide behavior.

2. Show `src/workspaces/module.ts`
   Explain: handlers + routes + guards in one module.

3. Run auth flow
   `POST /auth/register` then `POST /auth/login`.

4. Run protected route
   `GET /workspaces` with and without `Authorization` header.

5. Trigger controlled error
   `GET /workspaces/999` and show consistent error JSON.

6. Open generated spec
   `GET /openapi.json` to show docs are code-driven.

## What Developers Usually Ask

### “How much boilerplate do I need?”

Very little. Most features can be built by adding a module folder with `module.ts`, `meta`, and `routes`.

### “Can I enforce organization-wide behavior?”

Yes. Put it in root `meta.plugins` (`hook("request")`, `hook("error")`, CORS, shutdown, etc.).

### “How do nested resources work?”

Use `meta.prefix` for dynamic/nested paths like `/workspaces/:workspaceId/boards`.

### “How do I keep auth and permissions clean?”

Use composable guards (`authenticated`, `workspaceMember`, `workspaceAdmin`, `boardMember`) and run them at module or handler scope.

## Talking Points That Land Well

- “Folder structure is API structure unless you override with `meta.prefix`.”
- “No controller ceremony required; route map is explicit and type-safe.”
- “Hooks let you keep cross-cutting concerns out of business logic.”
- “Error shape can be standardized in one place (`HttpError.toJSON`).”

## Recommended Demo Commands

::: code-group

```bash [Terminal]
# login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123"}'

# protected route
curl http://localhost:3000/workspaces \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

# docs
curl http://localhost:3000/openapi.json | head
```

:::

## Mistakes to Avoid While Presenting

- Leading with abstractions before showing one real module.
- Showing too many files before the first successful request.
- Skipping failure cases; error behavior is one of the strongest trust signals.
