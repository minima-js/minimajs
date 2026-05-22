---
title: Logging
sidebar_position: 7
tags:
  - logger
  - observability
---

# Logger

Minima.js includes a built-in structured logger powered by [Pino](https://getpino.io). It automatically enriches every log entry with a `name` (the module that logged it) and — inside a request — a `requestId`, with no extra wiring required.

## Imports

```typescript
// Pre-built instance — use this in handlers and plugins
import { logger } from "@minimajs/server";

// Factory — use this when you need a custom logger instance
import { createLogger } from "@minimajs/server/logger";
```

## Basic Usage

```typescript
import { logger } from "@minimajs/server";

async function listUsers() {
  logger.info("Fetching users");
  const users = await db.users.findAll();
  logger.info({ count: users.length }, "Users fetched");
  return users;
}
```

Pino's argument order is **`(mergeObject, message)`**. Always put structured fields first, the message string second.

## Log Methods

### `logger.info()`

Normal operational events.

```typescript
logger.info({ userId: "u_123" }, "User signed in");
```

### `logger.warn()`

Recoverable issues worth monitoring.

```typescript
logger.warn({ ip: "203.0.113.10" }, "Rate limit near threshold");
```

### `logger.error()`

Failed operations and exceptions. Pass the error under the `err` key — Pino serializes it with stack trace and type automatically.

```typescript
try {
  await saveUser(data);
} catch (err) {
  logger.error({ err }, "Failed to save user");
}
```

### `logger.debug()`

Verbose diagnostics for development.

```typescript
logger.debug({ payload, size: payload.length }, "Payload received");
```

## Automatic Context Enrichment

Every log entry is automatically enriched — no manual fields needed.

### `name` — module path

Minima.js tracks which plugin/module each logger belongs to. Every entry gets a `name` field derived from the module chain and the handler function name:

```json
{ "level": "info", "name": "users:listUsers", "msg": "Fetching users" }
```

The format is `module/sub-module:handlerName`. If no module name is registered, the handler name alone is used (`:handlerName`).

### `requestId` — inside a request

Inside a request handler or hook, `requestId` is injected automatically from the `x-request-id` header (or a generated UUID if the header is absent):

```json
{
  "level": "info",
  "requestId": "376ed309-bd4b-47a8-b81b-3fb4437f783e",
  "name": "users:listUsers",
  "msg": "Fetching users"
}
```

You never need to thread `requestId` manually.

## App-Level Logger

Use `app.logger` in bootstrap code and plugins where there is no request context yet:

```typescript
import { createApp } from "@minimajs/server/node";

const app = createApp();
app.logger.info("Bootstrapping application");

app.register(async (child) => {
  child.logger.info("Plugin initializing");
});
```

Each registered plugin scope gets its own child logger with the module name pre-set.

## Configuration

### Log level

Set `LOG_LEVEL` to control verbosity:

```bash
LOG_LEVEL=debug node server.js
```

Supported values: `trace`, `debug`, `info`, `warn`, `error`, `fatal`.

### Output format

```bash
LOG_FORMAT=pretty node server.js   # human-readable (default in TTY)
LOG_FORMAT=json  node server.js    # structured JSON (default in non-TTY)
```

Pretty mode is automatically enabled when stdout is a TTY (interactive terminal) and disabled in CI/production pipelines.

## Custom Logger

Use `createLogger` when you need a logger with different options:

```typescript
import { createLogger } from "@minimajs/server/logger";

const log = createLogger({ level: "debug", pretty: false });
log.info("Custom logger ready");
```

To use a custom logger as the app logger, pass it to `createApp`:

```typescript
import { createApp } from "@minimajs/server/node";
import { createLogger } from "@minimajs/server/logger";

const app = createApp({ logger: createLogger({ level: "debug" }) });
```

## Related

- [Access Log](/plugins/access-log) — Automatic request/response logging with duration
- [Hooks](/guides/hooks) — Log lifecycle events with `request` and `send` hooks
- [Error Handling](/guides/error-handling) — Structured error responses and logging
