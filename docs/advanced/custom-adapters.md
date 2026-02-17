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
  remoteAddr(ctx: Context<T>): RemoteAddr | null;

  /**
   * Stops the server and closes all connections
   */
  close(server: T): Promise<void>;
}
```

Where:

- `T` is your native server type (e.g., `Deno.HttpServer`)
- `ListenOptions` contains `port` and optional `host`
- `RequestHandler` is a function that processes Web standard `Request` → `Response`

## Creating a Deno Adapter

Here's how to create an adapter for Deno:

```typescript
import type { ServerAdapter, ListenOptions, RequestHandler, ListenResult, AddressInfo } from "@minimajs/server";
import type { Server, Context, RemoteAddr } from "@minimajs/server";

const kReqInfo = Symbol("deno.request-info");

export class DenoServerAdapter implements ServerAdapter<Deno.HttpServer> {
  remoteAddr(ctx: Context<Deno.HttpServer>): RemoteAddr | null {
    const addr = ctx.locals[kReqInfo] as Deno.NetAddr;
    return {
      hostname: addr.hostname,
      port: addr.port,
      family: "IPv4",
    };
  }

  listen(
    srv: Server<Deno.HttpServer>,
    opts: ListenOptions,
    requestHandler: RequestHandler<Deno.HttpServer>
  ): Promise<ListenResult<Deno.HttpServer>> {
    const hostname = opts.host || "0.0.0.0";
    const port = opts.port;

    const server = Deno.serve({
      hostname,
      port,
      handler: (request, info) => {
        // Pass additional context
        return requestHandler(srv, request, {
          locals: { [kReqInfo]: info },
        });
      },
    });

    const address: AddressInfo = {
      hostname,
      port,
      family: "IPv4" as const,
      protocol: "http",
      href: `http://${hostname}:${port}/`,
    };
    return Promise.resolve({ server, address });
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

const adapter = new DenoServerAdapter();

const app = createBaseServer(adapter);

app.get("/", () => ({ message: "Hello from Deno!" }));

await app.listen({ port: 3000 });
```

## Key Considerations

### 1. Request/Response Conversion

Your adapter must convert between the runtime's native request/response format and Web standards:

- **Input**: Convert native request → Web `Request`
- **Output**: Convert Web `Response` → native response

### 2. Context Enrichment

The `RequestHandler` can include runtime-specific objects:

```ts
type RequestHandlerContext = { locals };
```

### 3. Address Information

Return accurate `AddressInfo` with:

- `hostname`: Bind address
- `port`: Port number
- `family`: "IPv4", "IPv6", or "unix"
- `href`: Full URL string

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
  logger: false, // or use custom pino logger
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
