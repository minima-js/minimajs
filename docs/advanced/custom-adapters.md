# Custom Runtime Adapters

Minima.js uses a flexible adapter pattern to support different runtime environments. Out of the box, it supports Node.js and Bun. This guide shows you how to create custom adapters for new runtimes like Deno, uWebSockets.js, or any other HTTP server implementation.

## Understanding Server Adapters

A server adapter is a bridge between Minima.js and the underlying HTTP server implementation. It abstracts runtime-specific details and provides a consistent interface for the framework.

### Adapter Interface

```typescript
interface ServerAdapter<T> {
  /**
   * Starts the server and begins listening for requests
   */
  listen(server: Server<T>, opts: ListenOptions, requestHandler: RequestHandler<T>): Promise<ListenResult<T>>;

  /**
   * Gets the remote address from the context
   */
  remoteAddr(ctx: Context<T>): string | null;

  /**
   * Stops the server and closes all connections
   */
  close(server: T): Promise<void>;
}
```

Where:

- `T` is your native server type (e.g., `Deno.HttpServer`, `uWS.TemplatedApp`)
- `ListenOptions` contains `port` and optional `host`
- `RequestHandler` is a function that processes Web standard `Request` → `Response`

## Creating a Deno Adapter

Here's how to create an adapter for Deno:

```typescript
import type { ServerAdapter, ListenOptions, RequestHandler, ListenResult } from "@minimajs/server/interfaces";
import type { Server, Context } from "@minimajs/server";

export interface DenoServerOptions {
  /** TLS certificate options */
  cert?: string;
  key?: string;
  /** Additional Deno.serve options */
  signal?: AbortSignal;
}

export class DenoServerAdapter implements ServerAdapter<Deno.HttpServer> {
  constructor(private readonly options: DenoServerOptions = {}) {}

  remoteAddr(ctx: Context<Deno.HttpServer>): string | null {
    // Deno provides remote address in request info
    const info = ctx.server.addr;
    if (info.transport === "tcp") {
      return info.hostname;
    }
    return null;
  }

  async listen(
    srv: Server,
    opts: ListenOptions,
    requestHandler: RequestHandler<Deno.HttpServer>
  ): Promise<ListenResult<Deno.HttpServer>> {
    const hostname = opts.host || "0.0.0.0";
    const port = opts.port;

    // Deno.serve returns HttpServer
    const server = Deno.serve({
      hostname,
      port,
      cert: this.options.cert,
      key: this.options.key,
      signal: this.options.signal,
      handler: (request, info) => {
        // Pass additional context
        return requestHandler(srv, request, { info });
      },
    });

    const address = {
      hostname,
      port,
      family: "IPv4" as const,
      protocol: (this.options.cert ? "https" : "http") as const,
      address: `${this.options.cert ? "https" : "http"}://${hostname}:${port}/`,
    };

    return { server, address };
  }

  async close(server: Deno.HttpServer): Promise<void> {
    await server.shutdown();
  }
}
```

### Using the Deno Adapter

```typescript
import { createBaseServer } from "@minimajs/server/core";
import { DenoServerAdapter } from "./deno-adapter.ts";

const adapter = new DenoServerAdapter({
  cert: await Deno.readTextFile("./cert.pem"),
  key: await Deno.readTextFile("./key.pem"),
});

const app = createBaseServer(adapter, {
  logger: false,
});

app.get("/", () => ({ message: "Hello from Deno!" }));

await app.listen({ port: 3000 });
```

## Creating a uWebSockets.js Adapter

For high-performance scenarios, you might want to use uWebSockets.js:

```typescript
import uWS from "uWebSockets.js";
import type { ServerAdapter, ListenOptions, RequestHandler, ListenResult } from "@minimajs/server/interfaces";

export interface UWSServerOptions {
  /** SSL certificate file path */
  cert_file_name?: string;
  /** SSL key file path */
  key_file_name?: string;
  /** Maximum payload size */
  maxPayloadLength?: number;
}

export class UWSServerAdapter implements ServerAdapter<uWS.TemplatedApp> {
  constructor(private readonly options: UWSServerOptions = {}) {}

  remoteAddr(ctx: Context<uWS.TemplatedApp>): string | null {
    // uWS provides IP in response object
    return ctx.uwsResponse?.getRemoteAddressAsText() || null;
  }

  async listen(
    srv: Server,
    opts: ListenOptions,
    requestHandler: RequestHandler<uWS.TemplatedApp>
  ): Promise<ListenResult<uWS.TemplatedApp>> {
    const hostname = opts.host || "0.0.0.0";
    const port = opts.port;

    // Create SSL or non-SSL app
    const server = this.options.cert_file_name ? uWS.SSLApp(this.options) : uWS.App();

    // Handle all routes with wildcard
    server.any("/*", async (res, req) => {
      // Convert uWS request to Web Request
      const url = `http://${hostname}:${port}${req.getUrl()}`;
      const method = req.getMethod().toUpperCase();

      const headers = new Headers();
      req.forEach((key, value) => headers.set(key, value));

      // Read body if present
      let body: ArrayBuffer | null = null;
      if (method !== "GET" && method !== "HEAD") {
        body = await new Promise((resolve) => {
          let buffer = new ArrayBuffer(0);
          res.onData((chunk, isLast) => {
            const arr = new Uint8Array(buffer.byteLength + chunk.byteLength);
            arr.set(new Uint8Array(buffer));
            arr.set(new Uint8Array(chunk), buffer.byteLength);
            buffer = arr.buffer;
            if (isLast) resolve(buffer);
          });
        });
      }

      const request = new Request(url, {
        method,
        headers,
        body: body,
      });

      // Process request through Minima.js
      const response = await requestHandler(srv, request, {
        uwsResponse: res,
      });

      // Send response back through uWS
      res.cork(() => {
        res.writeStatus(`${response.status} ${response.statusText}`);
        response.headers.forEach((value, key) => {
          res.writeHeader(key, value);
        });

        if (response.body) {
          const reader = response.body.getReader();
          const pump = async () => {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              return;
            }
            res.write(value);
            pump();
          };
          pump();
        } else {
          res.end();
        }
      });
    });

    // Start listening
    await new Promise<void>((resolve) => {
      server.listen(hostname, port, () => resolve());
    });

    const protocol = this.options.cert_file_name ? "https" : "http";
    const address = {
      hostname,
      port,
      family: "IPv4" as const,
      protocol: protocol as "http" | "https",
      address: `${protocol}://${hostname}:${port}/`,
    };

    return { server, address };
  }

  async close(server: uWS.TemplatedApp): Promise<void> {
    // uWS doesn't have a close method, it closes automatically
    // You might need to track the listen socket and close it
    return Promise.resolve();
  }
}
```

## Key Considerations

### 1. Request/Response Conversion

Your adapter must convert between the runtime's native request/response format and Web standards:

- **Input**: Convert native request → Web `Request`
- **Output**: Convert Web `Response` → native response

### 2. Context Enrichment

The `RequestHandlerContext` can include runtime-specific objects:

```typescript
type RequestHandlerContext<S> = {
  server?: S;
  [key: string]: any;
};
```

For example:

- Node.js: `{ incomingMessage, serverResponse }`
- Bun: `{}` (uses Web standards natively)
- Deno: `{ info: Deno.ServeHandlerInfo }`
- uWS: `{ uwsResponse: uWS.HttpResponse }`

### 3. Address Information

Return accurate `AddressInfo` with:

- `hostname`: Bind address
- `port`: Port number
- `family`: "IPv4", "IPv6", or "unix"
- `protocol`: "http" or "https"
- `address`: Full URL string

### 4. Graceful Shutdown

Implement proper cleanup in the `close()` method:

- Stop accepting new connections
- Wait for in-flight requests to complete (if possible)
- Clean up resources

### 5. Error Handling

Handle errors gracefully:

```typescript
async listen(/* ... */): Promise<ListenResult<T>> {
  try {
    // Start server
  } catch (error) {
    throw new Error(`Failed to start server: ${error.message}`);
  }
}
```

## Using Your Custom Adapter

Once you've created your adapter, use it with `createBaseServer`:

```typescript
import { createBaseServer } from "@minimajs/server/core";
import { MyCustomAdapter } from "./my-adapter.js";

const adapter = new MyCustomAdapter({
  // adapter-specific options
});

const app = createBaseServer(adapter, {
  prefix: "/api",
  logger: true,
});

app.get("/health", () => ({ status: "ok" }));

await app.listen({ port: 3000, host: "localhost" });
```

## Best Practices

1. **Type Safety**: Use TypeScript generics to maintain type safety
2. **Performance**: Minimize conversions and allocations in hot paths
3. **Standards**: Prefer Web standards (Request/Response) when available
4. **Testing**: Write comprehensive tests for your adapter
5. **Documentation**: Document runtime-specific behavior and limitations
6. **Error Messages**: Provide clear error messages for common issues

## Next Steps

- Learn about [Container and Encapsulation](./container-encapsulation.md)
- See [Architecture Overview](../core-concepts/architecture.md)
