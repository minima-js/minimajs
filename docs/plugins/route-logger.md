# Route Logger

The Route Logger is a development utility that provides a clear overview of all registered routes in your application. When the server starts, it prints a formatted, color-coded tree of all endpoints to the console.

This is incredibly useful for debugging and for quickly understanding the overall structure of your API.

## Usage

The route logger is **automatically enabled by default**. No configuration is required to see your route tree on startup.

When you start your application, you will see output similar to this in your console:

```
┌─ /
│  ├─ / (GET)
│  └─ /hello/:name (GET)
└─ /api
   └─ /users (GET)
```

## Configuration

You can customize or disable the route logger by re-registering it in your root module's `meta.plugins`.

### `enabled`

Disables the route logger completely when set to `false`.

- **Type**: `boolean`
- **Default**: `true`

::: code-group

```typescript [src/module.ts]
import { routeLogger } from "@minimajs/server/plugins";
import { type Meta } from "@minimajs/server";

export const meta: Meta = {
  plugins: [routeLogger({ enabled: false })],
};
```

:::

### `logger`

Allows you to provide a custom logging function to display the route tree.

- **Type**: `(message: string) => void`
- **Default**: A function that logs to the console using `app.log.info`.

::: code-group

```typescript [src/module.ts]
import { routeLogger } from "@minimajs/server/plugins";
import { type Meta } from "@minimajs/server";

export const meta: Meta = {
  plugins: [
    routeLogger({
      logger: (routes) => {
        console.log("--- Registered Application Routes ---");
        console.log(routes);
        console.log("------------------------------------");
      },
    }),
  ],
};
```

:::

### `commonPrefix`

Determines whether to display routes with their full path or with the common prefix removed for a more compact view.

- **Type**: `boolean`
- **Default**: `false`

::: code-group

```typescript [src/module.ts]
import { routeLogger } from "@minimajs/server/plugins";
import { type Meta } from "@minimajs/server";

export const meta: Meta = {
  plugins: [routeLogger({ commonPrefix: true })],
};
```

:::
