# @minimajs/openapi

OpenAPI 3.1 specification generator for MinimaJS with Zod schema integration.

## Installation

```bash
bun add @minimajs/openapi zod
```

## Features

- Generate OpenAPI 3.1 specification automatically from your routes
- Zod schema integration for request/response validation
- Type-safe route documentation
- Automatic path parameter extraction
- Support for query parameters, headers, and request bodies
- Customizable responses with status codes
- Security scheme definitions
- Tags and operation metadata

## Usage

### Basic Setup

```typescript
import { createApp } from "@minimajs/server/bun";
import { openapi, doc } from "@minimajs/openapi";
import { z } from "zod";

const app = createApp();

// Register the OpenAPI plugin
app.register(
  openapi({
    info: {
      title: "My API",
      version: "1.0.0",
      description: "API documentation",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
  })
);

// Define your routes with documentation
app.get(
  "/users/:id",
  doc({
    summary: "Get user by ID",
    description: "Retrieves a user by their unique identifier",
    tags: ["users"],
    params: z.object({
      id: z.string().uuid(),
    }),
    responses: {
      200: {
        description: "User found",
        schema: z.object({
          id: z.string().uuid(),
          name: z.string(),
          email: z.string().email(),
        }),
      },
      404: {
        description: "User not found",
      },
    },
  }),
  async (req) => {
    const { id } = req.params;
    // Your handler logic
    return { id, name: "John", email: "john@example.com" };
  }
);

await app.listen({ port: 3000 });
```

The OpenAPI specification will be available at `/openapi.json`.

### Custom OpenAPI Endpoint Path

```typescript
app.register(
  openapi({
    path: "/api/spec.json", // Custom path
    info: {
      title: "My API",
      version: "1.0.0",
    },
  })
);
```

### Route Documentation

#### Query Parameters

```typescript
import { doc } from "@minimajs/openapi";
import { z } from "zod";

app.get(
  "/users",
  doc({
    summary: "List users",
    query: z.object({
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(10),
      search: z.string().optional(),
    }),
    responses: {
      200: {
        description: "List of users",
        schema: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
          })
        ),
      },
    },
  }),
  async (req) => {
    // Handler logic
  }
);
```

#### Request Body

```typescript
app.post(
  "/users",
  doc({
    summary: "Create user",
    body: z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().int().min(0),
    }),
    responses: {
      201: {
        description: "User created",
        schema: z.object({
          id: z.string().uuid(),
          name: z.string(),
          email: z.string(),
        }),
      },
      400: {
        description: "Invalid request body",
      },
    },
  }),
  async (req) => {
    // Handler logic
  }
);
```

#### Headers

```typescript
app.get(
  "/protected",
  doc({
    summary: "Protected endpoint",
    headers: z.object({
      authorization: z.string(),
      "x-api-key": z.string().optional(),
    }),
    responses: {
      200: {
        description: "Success",
      },
      401: {
        description: "Unauthorized",
      },
    },
  }),
  async (req) => {
    // Handler logic
  }
);
```

### Tags and Organization

```typescript
app.register(
  openapi({
    info: {
      title: "My API",
      version: "1.0.0",
    },
    tags: [
      {
        name: "users",
        description: "User management operations",
      },
      {
        name: "products",
        description: "Product catalog operations",
      },
    ],
  })
);

app.get(
  "/users",
  doc({
    summary: "List users",
    tags: ["users"],
  }),
  async (req) => {
    // Handler logic
  }
);
```

### Security Schemes

```typescript
app.register(
  openapi({
    info: {
      title: "My API",
      version: "1.0.0",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        apiKey: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  })
);

app.get(
  "/admin/users",
  doc({
    summary: "Admin: List all users",
    tags: ["admin"],
    security: [{ bearerAuth: [] }, { apiKey: [] }],
  }),
  async (req) => {
    // Handler logic
  }
);
```

### Advanced Configuration

```typescript
app.register(
  openapi({
    info: {
      title: "My API",
      version: "2.0.0",
      description: "Complete API documentation",
      termsOfService: "https://example.com/terms",
      contact: {
        name: "API Support",
        url: "https://example.com/support",
        email: "support@example.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: "https://api.example.com",
        description: "Production",
      },
      {
        url: "https://staging-api.example.com",
        description: "Staging",
      },
      {
        url: "http://localhost:3000",
        description: "Development",
      },
    ],
    externalDocs: {
      description: "Full documentation",
      url: "https://docs.example.com",
    },
  })
);
```

### Response Headers

```typescript
app.get(
  "/download",
  doc({
    summary: "Download file",
    responses: {
      200: {
        description: "File content",
        headers: z.object({
          "content-type": z.string(),
          "content-length": z.string(),
          "content-disposition": z.string(),
        }),
      },
    },
  }),
  async (req) => {
    // Handler logic
  }
);
```

## API Reference

### `openapi(options)`

Creates an OpenAPI plugin for your MinimaJS application.

#### Options

- `info` (required): API information
  - `title`: API title
  - `version`: API version
  - `description`: API description
  - `termsOfService`: Terms of service URL
  - `contact`: Contact information
  - `license`: License information
- `path`: OpenAPI spec endpoint path (default: `/openapi.json`)
- `servers`: Array of server configurations
- `tags`: Array of tag definitions
- `security`: Global security requirements
- `components`: OpenAPI components (schemas, security schemes, etc.)
- `externalDocs`: External documentation link

### `doc(documentation)`

Route metadata decorator for documenting endpoints.

#### Documentation Object

- `summary`: Short description
- `description`: Detailed description
- `tags`: Array of tag names
- `operationId`: Unique operation identifier
- `deprecated`: Mark as deprecated
- `body`: Zod schema for request body
- `query`: Zod schema for query parameters
- `params`: Zod schema for path parameters
- `headers`: Zod schema for request headers
- `responses`: Response definitions by status code
- `security`: Security requirements for this endpoint

## Integration with @minimajs/schema

Combine with `@minimajs/schema` for runtime validation:

```typescript
import { createBody, createSearchParams } from "@minimajs/schema";
import { doc } from "@minimajs/openapi";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

const querySchema = z.object({
  page: z.number().int().min(1),
});

app.post(
  "/users",
  createBody(createUserSchema),
  createSearchParams(querySchema),
  doc({
    summary: "Create user",
    body: createUserSchema,
    query: querySchema,
    responses: {
      201: {
        description: "User created",
      },
    },
  }),
  async (req) => {
    // body() and searchParams() are validated
    const userData = req.body();
    const { page } = req.searchParams();
    // Handler logic
  }
);
```

## License

MIT
