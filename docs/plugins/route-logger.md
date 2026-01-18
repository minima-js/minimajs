# Route Logger

The Route Logger is a development utility that provides a clear overview of all registered routes in your application. When the server starts, it prints a formatted, color-coded tree of all endpoints to the console.

This is incredibly useful for debugging and for quickly understanding the overall structure of your API.

## Installation

The plugin is included with the `@minimajs/server` package and can be imported from `@minimajs/server/plugins`.

```typescript
import { routeLogger } from "@minimajs/server/plugins";
```

## Usage

Simply register the plugin with your application instance. It has no effect in production environments unless a custom logger is provided.

```typescript
app.register(routeLogger());
```

When you start your application, you will see output similar to this in your console:

```
┌─ /
│  ├─ / (GET)
│  └─ /hello/:name (GET)
└─ /api
   └─ /users (GET)
```

## Configuration

### `logger`

Allows you to provide a custom logging function to display the route tree.

- **Type**: `(message: string) => void`
- **Default**: A function that logs to the console using `chalk` for color.

```typescript
app.register(
  routeLogger({
    logger: (routes) => {
      console.log("--- Registered Application Routes ---");
      console.log(routes);
      console.log("------------------------------------");
    },
  })
);
```

### `commonPrefix`

Determines whether to display routes with their full path or with the common prefix removed for a more compact view.

- **Type**: `boolean`
- **Default**: `false`
