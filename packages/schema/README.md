# @minimajs/schema

Type-safe request validation for Minima.js powered by [Zod](https://zod.dev/). Validate request bodies, headers, search params, and route params with full TypeScript inference.

## Features

- 🔒 **Type-Safe** - Full TypeScript inference from Zod schemas
- ⚡ **Runtime Validation** - Catch invalid data before it reaches your handlers
- 🎯 **Context-Aware** - Validates and caches data in request context
- 🔄 **Async Support** - Built-in async validation for database checks
- 🛠️ **Flexible** - Control unknown field handling with `stripUnknown` option
- 📦 **Two APIs** - Simple validators and resource-based validation

## Installation

```bash
# Using Bun
bun add @minimajs/schema zod

# Using npm
npm install @minimajs/schema zod
```

## Two Validation Approaches

### 1. Simple Validators (Recommended for Basic Use)

Direct validation functions that parse data immediately:

```ts
import { createBody, createHeaders, createSearchParams } from "@minimajs/schema";
import { z } from "zod";

const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

const getUserData = createBody(userSchema);

app.post("/users", () => {
  const data = getUserData();
  return { created: data };
});
```

### 2. Resource API (Advanced - With Route Metadata)

Validation integrated with route metadata, validated in `request` hook:

```ts
import { createBody, schema, configureSchema } from "@minimajs/schema/resource";
import { z } from "zod";

// Register the schema plugin
app.register(configureSchema());

// Create validator
const getUserData = createBody(
  z.object({
    name: z.string(),
    email: z.string().email(),
  })
);

// Use with schema() descriptor
app.post("/users", schema(getUserData), () => {
  const data = getUserData(); // Already validated in request hook
  return { created: data };
});
```

## API Reference

### Simple Validators

#### `createBody<T>(schema, options?)`

Validates request body against a Zod schema.

```ts
import { createBody } from "@minimajs/schema";
import { z } from "zod";

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
});

const getUserData = createBody(userSchema);

app.post("/users", () => {
  const data = getUserData();
  // data: { name: string; email: string; age?: number }
  return { created: data };
});
```

**Options:**

- `stripUnknown?: boolean` - Strip unknown fields (default: `true`)

```ts
// Preserve unknown fields
const getUserData = createBody(userSchema, { stripUnknown: false });
```

#### `createBodyAsync<T>(schema, options?)`

Async version for schemas with async refinements:

```ts
import { createBodyAsync } from "@minimajs/schema";
import { z } from "zod";

const userSchema = z.object({
  email: z
    .string()
    .email()
    .refine(
      async (email) => {
        const exists = await db.users.exists({ email });
        return !exists;
      },
      { message: "Email already taken" }
    ),
  name: z.string(),
});

const getUserData = createBodyAsync(userSchema);

app.post("/users", async () => {
  const data = await getUserData();
  return { created: data };
});
```

#### `createHeaders<T>(schema, options?)`

Validates request headers:

```ts
import { createHeaders } from "@minimajs/schema";
import { z } from "zod";

const getHeaders = createHeaders({
  authorization: z.string().startsWith("Bearer "),
  "content-type": z.literal("application/json"),
});

app.post("/protected", () => {
  const headers = getHeaders();
  return { authenticated: true };
});
```

#### `createHeadersAsync<T>(schema, options?)`

Async version for header validation.

#### `createSearchParams<T>(schema, options?)`

Validates URL search/query parameters:

```ts
import { createSearchParams } from "@minimajs/schema";
import { z } from "zod";

const getQuery = createSearchParams({
  page: z.string().transform(Number).pipe(z.number().positive()),
  limit: z.string().transform(Number).pipe(z.number().max(100)),
  search: z.string().optional(),
});

app.get("/users", () => {
  const query = getQuery();

  return {
    page: query.page,
    limit: query.limit,
    users: [],
  };
});
```

#### `createSearchParamsAsync<T>(schema, options?)`

Async version for search params validation.

### Resource API (Advanced)

#### `createBody<T>(schema, options?)`

Creates a validator function with metadata for use with `schema()` descriptor:

```ts
import { createBody, schema, configureSchema } from "@minimajs/schema/resource";
import { z } from "zod";

app.register(configureSchema());

const getUserData = createBody(
  z.object({
    name: z.string(),
    email: z.string().email(),
  })
);

app.post("/users", schema(getUserData), () => {
  const data = getUserData(); // Already validated
  return { created: data };
});
```

#### `createHeaders<T>(schema, options?)`

Header validator for resource API.

#### `createSearchParams<T>(schema, options?)`

Search params validator for resource API.

#### `createParams<T>(schema, options?)`

Route params validator (resource API only):

```ts
import { createParams, schema, configureSchema } from "@minimajs/schema/resource";
import { z } from "zod";

app.register(configureSchema());

const getParams = createParams({
  id: z.string().uuid(),
});

app.get("/users/:id", schema(getParams), () => {
  const params = getParams();
  return { userId: params.id };
});
```

#### `schema(...validators)`

Route metadata descriptor that attaches validators to a route:

```ts
import { schema, createBody, createParams } from "@minimajs/schema/resource";

const getUserData = createBody(userSchema);
const getParams = createParams({ id: z.string().uuid() });

app.post("/users/:id", schema(getUserData, getParams), () => {
  const data = getUserData();
  const params = getParams();
  return { updated: data };
});
```

#### `configureSchema()`

Plugin that validates all schemas in the `request` hook:

```ts
import { configureSchema } from "@minimajs/schema/resource";

app.register(configureSchema());
```

## Error Handling

### ValidationError

Validation failures throw `ValidationError` (422 status):

```ts
import { ValidationError } from "@minimajs/schema";

try {
  const data = createBody(userSchema);
} catch (err) {
  if (err instanceof ValidationError) {
    console.log(err.message); // "Validation failed for 'email'"
    console.log(err.issues); // Zod issues array
  }
}
```

### Error Response Format

```json
{
  "message": "Validation failed for 'email', 'name'",
  "issues": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["email"],
      "message": "Required"
    }
  ]
}
```

### Custom Error Handling

```ts
import { hook } from "@minimajs/server";
import { ValidationError } from "@minimajs/schema";

app.register(
  hook("error", (error) => {
    if (error instanceof ValidationError) {
      return {
        success: false,
        errors: error.issues?.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      };
    }
  })
);
```

## Advanced Examples

### Nested Object Validation

```ts
const addressSchema = z.object({
  street: z.string(),
  city: z.string(),
  zipCode: z.string().regex(/^\d{5}$/),
});

const getUserData = createBody(
  z.object({
    name: z.string(),
    email: z.string().email(),
    address: addressSchema,
    alternateAddresses: z.array(addressSchema).optional(),
  })
);

app.post("/users", () => {
  const data = getUserData();
  return { created: data };
});
```

### Cross-Field Validation

```ts
const getUserData = createBody(
  z
    .object({
      password: z.string().min(8),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords must match",
      path: ["confirmPassword"],
    })
);

app.post("/register", () => {
  const data = getUserData();
  return { success: true };
});
```

### Database Uniqueness Check

```ts
const getUserData = createBodyAsync(
  z.object({
    email: z
      .string()
      .email()
      .refine(
        async (email) => {
          const user = await db.users.findOne({ email });
          return !user;
        },
        { message: "Email already exists" }
      ),
    name: z.string(),
  })
);

app.post("/users", async () => {
  const data = await getUserData();
  return { created: data };
});
```

### Transformations

```ts
const getQuery = createSearchParams({
  // Transform string to number
  page: z.string().transform(Number).pipe(z.number().positive()),

  // Trim whitespace
  search: z.string().trim().optional(),

  // Parse date
  startDate: z
    .string()
    .transform((str) => new Date(str))
    .pipe(z.date()),

  // Parse JSON
  filter: z
    .string()
    .transform((str) => JSON.parse(str))
    .pipe(z.object({ category: z.string() })),
});

app.get("/users", () => {
  const query = getQuery();

  return {
    page: query.page, // number
    search: query.search, // string | undefined
    startDate: query.startDate, // Date
    filter: query.filter, // { category: string }
  };
});
```

### Discriminated Unions

```ts
const getEventData = createBody(
  z.discriminatedUnion("type", [
    z.object({
      type: z.literal("user.created"),
      userId: z.string(),
      email: z.string().email(),
    }),
    z.object({
      type: z.literal("user.deleted"),
      userId: z.string(),
    }),
  ])
);

app.post("/webhooks", () => {
  const event = getEventData();

  switch (event.type) {
    case "user.created":
      return handleUserCreated(event);
    case "user.deleted":
      return handleUserDeleted(event);
  }
});
```

### Partial Updates

```ts
const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number(),
});

// Make all fields optional
const getUpdates = createBody(userSchema.partial());

app.patch("/users/:id", () => {
  const updates = getUpdates();
  return { updated: updates };
});
```

## When to Use Each API

### Simple Validators (`@minimajs/schema`)

**Best for:**

- Quick validation without route metadata
- Simple applications
- One-off validators
- Direct control over validation timing

```ts
import { createBody } from "@minimajs/schema";
```

### Resource API (`@minimajs/schema/resource`)

**Best for:**

- Complex applications with many routes
- Consistent validation across routes
- OpenAPI/documentation generation
- Validation in request hooks (before handler)

```ts
import { createBody, schema, configureSchema } from "@minimajs/schema/resource";
```

## TypeScript Tips

### Infer Types from Schemas

```ts
import { z } from "zod";

const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

type User = z.infer<typeof userSchema>;
// { name: string; email: string }
```

### Reusable Schemas

```ts
// schemas/user.ts
export const userIdSchema = z.string().uuid();

export const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

export const updateUserSchema = createUserSchema.partial();

export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
```

## Related

- [Zod Documentation](https://zod.dev/) - Schema validation library
- [Minima.js Server](https://minimajs.dev/) - Web framework
- [Validation Guide](/guides/validation) - Comprehensive validation guide

## License

MIT
