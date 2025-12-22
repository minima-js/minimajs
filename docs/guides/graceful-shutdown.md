---
title: Graceful Shutdown
---

# Graceful Shutdown in Minima.js

**Overview**

Minima.js offers built-in support for graceful shutdown, ensuring applications terminate in a controlled and predictable manner when instructed to do so. This feature prevents abrupt terminations that could lead to data loss or inconsistencies.

**Key Features:**

- **Automatic SIGTERM Handling:** By default, Minima.js listens for the `SIGTERM` signal, a common signal used to initiate process termination. Upon receiving this signal, it begins the graceful shutdown process.
- **Customizable Handling:** You can adjust the shutdown behavior by:
  - Specifying additional signals to listen for using the `killSignal` option within `createApp()`.
  - Disabling graceful shutdown entirely by passing an empty array `[]` to `killSignal`.
- **Lifecycle Hooks:** Minima.js provides hooks to execute custom logic during specific lifecycle stages, such as cleaning up resources before shutdown:
  - `app.register(hook('close', () => closeDBConnection()))`

**Example Configuration:**

```typescript
import { createApp, hook } from "@minimajs/server";

// Listen for multiple signals, including SIGINT (Ctrl+C)
const app = createApp({
  killSignal: ["SIGTERM", "SIGINT"],
});

// Example hook for closing database connections
app.register(hook("close", () => closeDBConnection()));

app.listen({ port: 1234 });
```

**Additional Considerations:**

- **Signal Interference:** Minima.js avoids interfering with the signals if it's already being handled elsewhere.
- **Documentation:** Refer to https://nodejs.org/api/process.html#signal-events for more signal events.
