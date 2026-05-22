# Access Log

The Access Log plugin logs every incoming request with its HTTP method, path, response status code, and duration in milliseconds.

## Usage

::: code-group

```typescript [src/module.ts]
import { type Meta } from "@minimajs/server";
import { accessLog } from "@minimajs/server/plugins";

export const meta: Meta = {
  plugins: [accessLog()],
};
```

:::

Each request produces a structured log entry:

```json
{ "level": "info", "status": 200, "duration": 12, "msg": "GET /users" }
```

The `duration` is in milliseconds, rounded to the nearest integer.

## Configuration

### `level`

The log level used for access log entries.

- **Type**: `"trace" | "debug" | "info"`
- **Default**: `"info"`

Use `"debug"` to suppress access logs in production without disabling the plugin entirely:

::: code-group

```typescript [src/module.ts]
import { type Meta } from "@minimajs/server";
import { accessLog } from "@minimajs/server/plugins";

export const meta: Meta = {
  plugins: [accessLog({ level: "debug" })],
};
```

:::

## Scoped Registration

Because the plugin uses `ctx.app.logger`, registering it on a sub-module scopes the logs to that module's logger (and its `name` field):

::: code-group

```typescript [src/users/module.ts]
import { type Meta } from "@minimajs/server";
import { accessLog } from "@minimajs/server/plugins";

export const meta: Meta = {
  name: "users",
  plugins: [accessLog()],
};
```

:::

```json
{ "level": "info", "name": "users", "status": 201, "duration": 8, "msg": "POST /users" }
```
