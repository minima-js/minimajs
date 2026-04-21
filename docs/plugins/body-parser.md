# Body Parser

The Body Parser plugin is responsible for parsing incoming request bodies based on their `Content-Type` header. It enables the use of the `body()` context-aware function to access the parsed body in your route handlers.

## Installation

The plugin is included with the `@minimajs/server` package and can be imported from `@minimajs/server/plugins`.

```typescript
import { bodyParser } from "@minimajs/server/plugins";
```

## Default Behavior

**The body parser is automatically enabled by default**. It is configured to parse `application/json` content types, so you can use the `body()` function immediately without any setup.

::: code-group

```typescript [src/users/module.ts]
import { body, type Routes } from "@minimajs/server";

function createUser() {
  const newUser = body<{ name: string; email: string }>();
  // ... create user
  return { created: newUser };
}

export const routes: Routes = {
  // Body parser is already enabled - no registration needed!
  "POST /": createUser,
};
```

:::

## Configuration

You can override the default configuration or disable the body parser by re-registering it with different options in your module's `meta.plugins`.

### `type`

Specifies the content types to parse. Re-registering with a different `type` will override the default JSON-only configuration.

- **Type**: `("json" | "text" | "form" | "arrayBuffer" | "blob")[]`
- **Default**: `["json"]`

::: code-group

```typescript [src/logs/module.ts]
import { bodyParser } from "@minimajs/server/plugins";
import { body, type Meta, type Routes } from "@minimajs/server";

// Override to parse JSON and plain text for this module
export const meta: Meta = {
  plugins: [bodyParser({ type: ["json", "text"] })],
};

function logText() {
  const logMessage = body<string>();
  console.log(logMessage);
  return { status: "logged" };
}

export const routes: Routes = {
  "POST /text": logText,
};
```

:::

### `clone`

Clones the request object before parsing the body. This can be useful if you need to read the raw request body stream more than once.

- **Type**: `boolean`
- **Default**: `false`

```typescript
export const meta: Meta = {
  plugins: [bodyParser({ type: "json", clone: true })],
};
```

### `enabled`

Disables the body parser when set to `false`. This removes the body parser entirely, and calling `body()` will throw an error.

- **Type**: `boolean`
- **Default**: `true` (enabled by default)

::: code-group

```typescript [src/raw/module.ts]
import { bodyParser } from "@minimajs/server/plugins";
import { type Meta } from "@minimajs/server";

// Disable body parser for this module
export const meta: Meta = {
  plugins: [bodyParser({ enabled: false })],
};
```

:::

## Examples

### Using Default Configuration

Since body parser is enabled by default, you can use it immediately in any module:

::: code-group

```typescript [src/api/module.ts]
import { body, type Routes } from "@minimajs/server";

function createUser() {
  const user = body<{ name: string; email: string }>();
  return { created: user };
}

export const routes: Routes = {
  "POST /users": createUser,
};
```

:::

### Overriding Configuration

Re-register the body parser in your root module to change its configuration application-wide:

::: code-group

```typescript [src/module.ts]
import { bodyParser } from "@minimajs/server/plugins";
import { body, type Meta, type Routes } from "@minimajs/server";

// Change from JSON-only to support both JSON and text globally
export const meta: Meta = {
  plugins: [bodyParser({ type: ["json", "text"] })],
};

function logItem() {
  const log = body<string>(); // Can now parse text/plain
  return { logged: log };
}

export const routes: Routes = {
  "POST /logs": logItem,
};
```

:::

### Disabling Body Parser

If you don't need body parsing, you can disable it:

```typescript
export const meta: Meta = {
  plugins: [bodyParser({ enabled: false })],
};
```
