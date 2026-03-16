# @minimajs/schema — Validation Reference

Zod-based validation integrated with the context API. Validators read from the request context automatically — no arguments needed when called inside a handler.

## Request validators

```typescript
import { createBody, createHeaders, createSearchParams, createParams } from "@minimajs/schema";
import { z } from "zod";

const getBody = createBody(z.object({ name: z.string(), age: z.number() }));
const getSearch = createSearchParams({ page: z.coerce.number().default(1) });
const getParams = createParams({ id: z.string().uuid() });
const getHeaders = createHeaders({ authorization: z.string() });

// In handler — reads from context, validates, throws ValidationError (422) on failure
function handler() {
  const { name, age } = getBody();
  const { page } = getSearch();
  const { id } = getParams();
  const { authorization } = getHeaders();
}
```

Each `create*` function accepts:
1. A Zod schema (object or `z.object({...})`)
2. Options: `{ stripUnknown?: boolean, name?: string }`
   - `stripUnknown: true` (default) — strips extra fields
   - `stripUnknown: false` — allows extra fields through
   - `name` — used in OpenAPI operationId generation

## Async variants

Use when the Zod schema contains async refinements:

```typescript
import { createBodyAsync, createHeadersAsync, createSearchParamsAsync, createParamsAsync } from "@minimajs/schema";

const getBody = createBodyAsync(z.object({
  username: z.string().refine(async (val) => !(await User.exists(val)), "Username taken"),
}));

// In handler — must await
async function createUser() {
  const { username } = await getBody();
}
```

## Response schemas (for OpenAPI only — no runtime validation)

```typescript
import { createResponse, createResponseHeaders } from "@minimajs/schema";

// Default 200
const UserResponse = createResponse(z.object({ id: z.string(), name: z.string() }));

// Specific status
const Created = createResponse(201, z.object({ id: z.string() }));
const BadRequest = createResponse(400, z.object({ error: z.string() }));
const NotFound = createResponse(404, z.object({ message: z.string() }));

// Response headers (for OpenAPI)
const RespHeaders = createResponseHeaders({ "x-request-id": z.string() });
const Auth401Headers = createResponseHeaders(401, { "www-authenticate": z.string() });
```

## schema() descriptor

Attaches validators to a route for OpenAPI spec generation. Pass any mix of request validators and response schemas:

```typescript
import { schema } from "@minimajs/schema";

app.post("/users",
  schema(
    getBody,           // request body validator
    getParams,         // request params validator
    getSearch,         // query params validator
    UserResponse,      // 200 response schema
    Created,           // 201 response schema
    BadRequest,        // 400 response schema
  ),
  handler
);
```

Order doesn't matter — `schema()` inspects each descriptor's `.kDataType` to categorize it.

## ValidationError

```typescript
import { ValidationError } from "@minimajs/schema";
// also available from @minimajs/schema/error

// Status 422, has .issues (ZodIssue[])
// Override globally at startup:
ValidationError.toJSON = (err) => ({
  success: false,
  error: "Validation failed",
  issues: err.issues?.map(i => ({
    field: i.path.join("."),
    message: i.message,
    code: i.code,
  })),
});
```

## Low-level validator (use schema() instead for routes)

```typescript
import { validator, validatorAsync } from "@minimajs/schema";

// Create a reusable standalone validator (not tied to context)
const validate = validator(z.object({ email: z.string().email() }));
const result = validate({ email: "test@example.com" }); // throws ValidationError on failure
```
