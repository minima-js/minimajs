# CORS

The CORS plugin manages Cross-Origin Resource Sharing (CORS) headers for your application. This is essential for browser-based clients that access your API from a different domain, origin, or port.

## Installation

The plugin is included with the `@minimajs/server` package and can be imported from `@minimajs/server/plugins`.

```typescript
import { cors } from "@minimajs/server/plugins";
```

## Usage

Register the plugin with your application instance. The default configuration is permissive, allowing requests from all origins.

```typescript
// Allow requests from all origins
app.register(cors());
```

## Configuration

For production environments, you should configure the plugin with more restrictive options to enhance security.

### `origin`

Controls the `Access-Control-Allow-Origin` header.

- **Type**: `string | string[] | ((origin: string) => boolean | Promise<boolean>)`
- **Default**: `*`

```typescript
// Allow a single origin
app.register(cors({ origin: "https://my-app.com" }));

// Allow multiple origins
app.register(cors({ origin: ["https://app-v1.com", "https://app-v2.com"] }));

// Dynamic origin validation
app.register(
  cors({
    origin: (origin) => {
      // Allow all subdomains of example.com
      return origin.endsWith(".example.com");
    },
  })
);
```

### Other Options

- **`methods`**: Configures `Access-Control-Allow-Methods`. Default: `'GET,HEAD,PUT,PATCH,POST,DELETE'`.
- **`allowedHeaders`**: Configures `Access-Control-Allow-Headers`.
- **`exposedHeaders`**: Configures `Access-Control-Expose-Headers`.
- **`credentials`**: Configures `Access-Control-Allow-Credentials`. Default: `false`.
- **`maxAge`**: Configures `Access-Control-Max-Age` (in seconds).
- **`optionsSuccessStatus`**: Status code to use for successful `OPTIONS` requests. Default: `204`.

**Example with multiple options:**

```typescript
app.register(
  cors({
    origin: "https://my-app.com",
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
```
