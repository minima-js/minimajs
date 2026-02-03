# Body Parser

The Body Parser plugin is responsible for parsing incoming request bodies based on their `Content-Type` header. It enables the use of the `body()` context-aware function to access the parsed body in your route handlers.

## Installation

The plugin is included with the `@minimajs/server` package and can be imported from `@minimajs/server/plugins`.

```typescript
import { bodyParser } from "@minimajs/server/plugins";
```

## Default Behavior

**The body parser is automatically enabled by default**. It is configured to parse `application/json` content types, so you can use the `body()` function immediately without any setup.

```typescript
import { createApp } from "@minimajs/server/bun";
import { body } from "@minimajs/server";

const app = createApp();

// Body parser is already enabled - no registration needed!
app.post("/users", () => {
  const newUser = body<{ name: string; email: string }>();
  // ... create user
  return { created: newUser };
});
```

## Configuration

You can override the default configuration or disable the body parser by re-registering it with different options.

### `type`

Specifies the content types to parse. Re-registering with a different `type` will override the default JSON-only configuration.

- **Type**: `("json" | "text" | "form" | "arrayBuffer" | "blob")[]`
- **Default**: `["json"]`

```typescript
// Override to parse JSON and plain text
app.register(bodyParser({ type: ["json", "text"] }));

app.post("/text-log", () => {
  const logMessage = body<string>();
  console.log(logMessage);
  return { status: "logged" };
});
```

### `clone`

Clones the request object before parsing the body. This can be useful if you need to read the raw request body stream more than once.

- **Type**: `boolean`
- **Default**: `false`

```typescript
// Override default configuration to enable cloning
app.register(bodyParser({ type: "json", clone: true }));
```

### `enabled`

Disables the body parser when set to `false`. This removes the body parser entirely, and calling `body()` will throw an error.

- **Type**: `boolean`
- **Default**: `true` (enabled by default)

```typescript
// Disable body parser
app.register(bodyParser({ enabled: false }));

// You can re-enable it later with a different configuration
app.register(bodyParser({ type: "text" }));
```

## Examples

### Using Default Configuration

Since body parser is enabled by default, you can use it immediately:

```typescript
import { createApp } from "@minimajs/server/bun";
import { body } from "@minimajs/server";

const app = createApp();

app.post("/api/users", () => {
  const user = body<{ name: string; email: string }>();
  return { created: user };
});
```

### Overriding Configuration

Re-register the body parser to change its configuration:

```typescript
// Change from JSON-only to support both JSON and text
app.register(bodyParser({ type: ["json", "text"] }));

app.post("/api/logs", () => {
  const log = body<string>(); // Can now parse text/plain
  return { logged: log };
});
```

### Disabling Body Parser

If you don't need body parsing, you can disable it:

```typescript
// Disable body parser
app.register(bodyParser({ enabled: false }));
```
