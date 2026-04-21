# CORS

The CORS plugin manages Cross-Origin Resource Sharing (CORS) headers for your application. This is essential for browser-based clients that access your API from a different domain, origin, or port.

## Installation

The plugin is included with the `@minimajs/server` package and can be imported from `@minimajs/server/plugins`.

```typescript
import { cors } from "@minimajs/server/plugins";
```

## Usage

Register the plugin within your module's `meta.plugins`. The default configuration is permissive, allowing requests from all origins.

::: code-group

```typescript [src/module.ts]
import { cors } from "@minimajs/server/plugins";
import { type Meta } from "@minimajs/server";

// Allow requests from all origins globally
export const meta: Meta = {
  plugins: [cors()],
};
```

:::

## Configuration

For production environments, you should configure the plugin with more restrictive options to enhance security.

### `origin`

Controls the `Access-Control-Allow-Origin` header.

- **Type**: `string | string[] | ((origin: string) => boolean | Promise<boolean>)`
- **Default**: `*`

::: code-group

```typescript [src/module.ts]
import { cors } from "@minimajs/server/plugins";
import { type Meta } from "@minimajs/server";

export const meta: Meta = {
  plugins: [
    // Allow a single origin
    cors({ origin: "https://my-app.com" }),

    // Allow multiple origins
    cors({ origin: ["https://app-v1.com", "https://app-v2.com"] }),

    // Dynamic origin validation
    cors({
      origin: (origin) => {
        // Allow all subdomains of example.com
        return origin.endsWith(".example.com");
      },
    }),
  ],
};
```

:::

### Other Options

- **`methods`**: Configures `Access-Control-Allow-Methods`. Default: `'GET,HEAD,PUT,PATCH,POST,DELETE'`.
- **`allowedHeaders`**: Configures `Access-Control-Allow-Headers`.
- **`exposedHeaders`**: Configures `Access-Control-Expose-Headers`.
- **`credentials`**: Configures `Access-Control-Allow-Credentials`. Default: `false`.
- **`maxAge`**: Configures `Access-Control-Max-Age` (in seconds).
- **`optionsSuccessStatus`**: Status code to use for successful `OPTIONS` requests. Default: `204`.

**Example with multiple options:**

::: code-group

```typescript [src/api/module.ts]
import { cors } from "@minimajs/server/plugins";
import { type Meta } from "@minimajs/server";

export const meta: Meta = {
  plugins: [
    cors({
      origin: "https://my-app.com",
      methods: ["GET", "POST"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  ],
};
```

:::
