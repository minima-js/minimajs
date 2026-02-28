---
title: Logging
sidebar_position: 7
tags:
  - logger
  - observability
---

# Logger

Minima.js includes a built-in logger powered by Pino. You can use it in handlers, hooks, and plugins without manually wiring logger instances.

## Quick Reference

- [`logger.info()`](#loggerinfo) - Log normal operational events
- [`logger.warn()`](#loggerwarn) - Log recoverable issues
- [`logger.error()`](#loggererror) - Log failures
- [`logger.debug()`](#loggerdebug) - Log debug details
- [`app.log`](#applog) - Access app-level logger during setup

---

## Basic Usage

```typescript
import { logger, searchParams, type Routes } from "@minimajs/server";

async function listServices() {
  logger.info("Service request", { query: searchParams().toJSON() });
  return { ok: true };
}

export const routes: Routes = {
  "GET /services": listServices,
};
```

## `logger.info()`

Use for expected, successful application flow.

```typescript
import { logger } from "@minimajs/server";

logger.info("User signed in", { userId: "u_123" });
```

## `logger.warn()`

Use for non-fatal issues you should monitor.

```typescript
import { logger } from "@minimajs/server";

logger.warn("Rate limit near threshold", { ip: "203.0.113.10" });
```

## `logger.error()`

Use for failed operations and exceptions.

```typescript
import { logger } from "@minimajs/server";

try {
  await saveUser();
} catch (error) {
  logger.error("Failed to save user", { error });
}
```

## `logger.debug()`

Use for verbose diagnostics during development.

```typescript
import { logger } from "@minimajs/server";

logger.debug("Payload received", { size: 1024 });
```

## `app.log`

Use the app-level logger in bootstrap/setup code.

```typescript
import { createApp } from "@minimajs/server/bun";

const app = createApp();
app.log.info("Bootstrapping application");
```

## Best Practices

- Prefer structured fields over string interpolation.
- Use consistent keys (`requestId`, `userId`, `durationMs`) to simplify queries.
- Keep debug logs focused to avoid noisy production output.

---

## Related Guides

- [Hooks](/guides/hooks) - Log request/response lifecycle events with `request` and `send`
- [Error Handling](/guides/error-handling) - Standardize error logging and formatting
- [HTTP Helpers](/guides/http) - Add request metadata (headers, params) to logs
- [Middleware](/guides/middleware) - Wrap full request timing or tracing flows
