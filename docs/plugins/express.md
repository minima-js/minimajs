# Express Middleware

The Express plugin allows you to integrate Express.js-style middleware into your Minima.js application. This provides compatibility with the vast ecosystem of Express middleware while maintaining Minima.js's lightweight architecture.

## Installation

The plugin is included with the `@minimajs/server` package and can be imported from `@minimajs/server/plugins`.

```typescript
import { express } from "@minimajs/server/plugins/express";
```

## Usage

Register Express-style middleware with your application instance. The middleware function receives the Node.js `req` and `res` objects, along with a `next` callback.

```typescript
import { createApp } from "@minimajs/server";
import { express } from "@minimajs/server/plugins/express";

const app = createApp();

// Use Express middleware
app.register(
  express((req, res, next) => {
    console.log("Request URL:", req.url);
    next();
  })
);
```

## Important Notes

:::warning Node.js Only
This plugin **only works with Node.js servers**. It requires access to the underlying `IncomingMessage` and `ServerResponse` objects from Node.js's HTTP module.
:::

## Examples

### Using Third-Party Express Middleware

You can use existing Express middleware packages:

```typescript
import helmet from "helmet";
import compression from "compression";

// Security headers
app.register(express(helmet()));

// Response compression
app.register(express(compression()));
```

### Custom Middleware

Create custom Express-style middleware for specific needs:

```typescript
app.register(
  express((req, res, next) => {
    // Add custom headers
    res.setHeader("X-Custom-Header", "MyValue");
    next();
  })
);
```

### Error Handling

Pass errors to the Minima.js error handling system using the `next` callback:

```typescript
app.register(
  express((req, res, next) => {
    try {
      // Some operation that might fail
      validateRequest(req);
      next();
    } catch (error) {
      next(error);
    }
  })
);
```

## Type Definitions

```typescript
export type ExpressCallback = (req: unknown, res: unknown, next: (err?: unknown) => void) => void;
```

The callback function signature matches Express.js middleware:

- `req`: The Node.js `IncomingMessage` object
- `res`: The Node.js `ServerResponse` object
- `next`: A callback to continue to the next middleware or pass an error

## Integration with Minima.js Context

The Express middleware integrates with Minima.js's context system:

- `req` corresponds to `ctx.incomingMessage`
- `res` corresponds to `ctx.serverResponse`
- Errors passed to `next()` are handled by Minima.js's error handling system
