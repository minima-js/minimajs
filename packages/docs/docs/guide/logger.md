---
title: Logging
sidebar_position: 4
tags:
  - context
  - logger
---

# MinimaJS: Integrated Logging with Pino

MinimaJS streamlines development by offering a built-in logger powered by Pino. This logger simplifies debugging and monitoring by providing informative messages about your application's execution.

**Leveraging the Built-in Logger:**

Here's how to integrate it into your code:

**Example:**

```typescript title="src/services/index.ts"
import { logger, type App, getSearchParams } from "@minimajs/server";

async function serviceHandler() {
  // Log request details with search parameters
  logger.info("received service request with %o", getSearchParams());
  return "service request";
}

export async function serviceModule(app: App) {
  app.get("/", serviceHandler);
}
```

In this example:

1. We import `logger` and other necessary functions.
2. Inside `serviceHandler`, we leverage `logger.info` to log a message with the received search parameters using a placeholder (`%o`) for the object.

**Console Output:**

When you run your application and make a request like `curl http://localhost:1234/services?name=John`, the console might display an output similar to:

```
INFO (serviceModule:serviceHandler/21961): received service request with {"name":"John"}
```

**Breakdown of the Output:**

- `INFO`: The log level (in this case, informational)
- `(serviceModule:serviceHandler/21961)`: Indicates the source of the log message (&lt;Module Name>:&lt;Handler function>/&lt;Process Id>)
- `received service request with {"name":"John"}`: The actual log message with the interpolated search parameters object.

**Embrace Streamlined Development with MinimaJS's Built-in Logging**

By incorporating the built-in Pino logger, MinimaJS empowers you to construct well-instrumented Node.js applications, fostering efficient development and a clear understanding of your application's execution flow.
