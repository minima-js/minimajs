# Proxy

The Proxy plugin extracts client information from proxy headers when your application is behind a reverse proxy, load balancer, or CDN. It handles IP address extraction, protocol detection, and hostname reconstruction from common proxy headers like `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Forwarded-Host`.

## Installation

The plugin is included with the `@minimajs/server` package and can be imported from `@minimajs/server/plugins`.

```typescript
import { proxy } from "@minimajs/server/plugins";
```

## Usage

Register the plugin with your application instance and configure which proxy headers to trust. By default, all features (IP, host, and proto extraction) are automatically enabled when you provide `trustProxies`.

```typescript
// Simplest usage - auto-enables all features
app.register(proxy({ trustProxies: true }));

app.get("/client-info", (ctx) => {
  const clientIp = ctx.locals[kIpAddr];
  const { host, proto } = ctx.$metadata;
  return { ip: clientIp, host, proto };
});
```

You can disable specific features by setting them to `false`:

```typescript
// Only extract IP, disable host and proto
app.register(
  proxy({
    trustProxies: true,
    host: false,
    proto: false,
  })
);
```

> **Note**: `host` and `proto` are always extracted together. If you enable one (or leave both as default), both will be extracted. To disable both, explicitly set both to `false`. When trusted proxy headers are not available, the plugin will fall back to extracting from the request URL and headers.

## Configuration

The plugin provides fine-grained control over proxy header extraction and trust validation.

### `trustProxies`

Determines whether to trust proxy headers from the incoming request.

- **Type**: `boolean | string[] | ((ctx: Context) => boolean)`
- **Required**: Yes

```typescript
// Trust all proxies (development only)
app.register(proxy({ trustProxies: true }));

// Trust specific proxy IP addresses (Node.js HTTP server only)
app.register(
  proxy({
    trustProxies: ["127.0.0.1", "10.0.0.1"],
  })
);

// Custom trust validator
app.register(
  proxy({
    trustProxies: (ctx) => {
      const ip = ctx.incomingMessage?.socket?.remoteAddress;
      return ip?.startsWith("10.") || ip === "127.0.0.1";
    },
  })
);
```

> **Note**: The IP array validation (`trustProxies: string[]`) only works with Node.js HTTP servers where socket information is available. For Bun servers or other runtimes, use `trustProxies: true` or a custom function validator.

### `ip`

Configures IP address extraction from proxy headers. Enabled by default, set to `false` to disable.

- **Type**: `IpSettings | IpCallback | false`
- **Default**: Enabled (uses default settings)

#### Disabling IP Extraction

```typescript
app.register(
  proxy({
    trustProxies: true,
    ip: false, // Disable IP extraction
  })
);
```

#### Using Settings Object

```typescript
app.register(
  proxy({
    trustProxies: true,
    ip: {
      header: "x-forwarded-for", // Header name (default)
      proxyDepth: 1, // Number of proxies to skip (optional)
    },
  })
);
```

**Options:**

- `header` (string | string[]): Header name(s) to check. Default: `"x-forwarded-for"`
- `proxyDepth` (number): Number of proxies to skip when extracting IP. Default: `1`

```typescript
// Skip 2 proxies in the chain
app.register(
  proxy({
    trustProxies: true,
    ip: { proxyDepth: 2 },
  })
);
```

#### Using Custom Callback

```typescript
app.register(
  proxy({
    trustProxies: true,
    ip: (ctx) => {
      // Extract from custom header
      return ctx.request.headers.get("cf-connecting-ip") || ctx.request.headers.get("x-real-ip") || null;
    },
  })
);
```

### `host`

Configures hostname extraction from proxy headers. Enabled by default, set to `false` to disable.

- **Type**: `HostSettings | HostCallback | false`
- **Default**: Enabled (uses default settings)

> **Note**: `host` and `proto` are always extracted together. To disable both, you must set both `host: false` and `proto: false`.

#### Disabling Host Extraction

```typescript
app.register(
  proxy({
    trustProxies: true,
    host: false, // Must also set proto: false to disable both
    proto: false,
  })
);
```

#### Using Settings Object

```typescript
app.register(
  proxy({
    trustProxies: true,
    host: {
      header: "x-forwarded-host", // Header name (default)
      stripPort: true, // Remove port from hostname (optional)
    },
  })
);
```

**Options:**

- `header` (string | string[]): Header name(s) to check. Default: `"x-forwarded-host"`
- `stripPort` (boolean): Whether to strip port from hostname. Default: `false`

```typescript
// Multiple header fallback
app.register(
  proxy({
    trustProxies: true,
    host: {
      header: ["x-forwarded-host", "x-original-host"],
      stripPort: true,
    },
  })
);
```

#### Using Custom Callback

```typescript
app.register(
  proxy({
    trustProxies: true,
    host: (ctx) => {
      return ctx.request.headers.get("x-forwarded-host") || "example.com";
    },
  })
);
```

### `proto`

Configures protocol extraction from proxy headers. Enabled by default, set to `false` to disable.

- **Type**: `ProtoSettings | ProtoCallback | false`
- **Default**: Enabled (uses default settings)

> **Note**: `proto` and `host` are always extracted together. To disable both, you must set both `proto: false` and `host: false`.

#### Disabling Proto Extraction

```typescript
app.register(
  proxy({
    trustProxies: true,
    proto: false, // Must also set host: false to disable both
    host: false,
  })
);
```

#### Using Settings Object

```typescript
app.register(
  proxy({
    trustProxies: true,
    proto: {
      header: "x-forwarded-proto", // Header name (default)
    },
  })
);
```

**Options:**

- `header` (string | string[]): Header name(s) to check. Default: `"x-forwarded-proto"`

```typescript
// Multiple header fallback for different cloud providers
app.register(
  proxy({
    trustProxies: true,
    proto: {
      header: ["x-forwarded-proto", "cloudfront-forwarded-proto", "x-arr-ssl"],
    },
  })
);
```

#### Using Custom Callback

```typescript
app.register(
  proxy({
    trustProxies: true,
    proto: (ctx) => {
      // Custom protocol detection logic
      const proto = ctx.request.headers.get("x-forwarded-proto");
      return proto === "on" ? "https" : "http";
    },
  })
);
```

## Complete Examples

### Behind NGINX

```typescript
app.register(
  proxy({
    trustProxies: ["127.0.0.1"], // Trust localhost NGINX
    ip: { proxyDepth: 1 },
    host: { stripPort: true },
  })
);
```

### Behind AWS ALB/CloudFront

```typescript
app.register(
  proxy({
    trustProxies: true,
    host: { stripPort: true },
    proto: {
app.register(
  proxy({
    trustProxies: true,
    host: { stripPort: true },
    proto: {
      header: ["x-forwarded-proto", "cloudfront-forwarded-proto"],
    },
  })
);
```

### Behind Multiple Proxies

```typescript
app.register(
  proxy({
    trustProxies: ["10.0.0.1", "10.0.0.2"], // Trust specific proxies
    ip: { proxyDepth: 2 }, // Skip 2 proxies
    host: {
      header: ["x-forwarded-host", "x-original-host"],
      stripPort: true,
    },
  })
);
```

### Custom Logic for All Options

```typescript
app.register(
  proxy({
    trustProxies: (ctx) => {
      const ip = ctx.incomingMessage?.socket?.remoteAddress;
      return ip === "127.0.0.1" || ip?.startsWith("10.");
    },
    ip: (ctx) => {
      // Prefer Cloudflare header, fallback to X-Forwarded-For
      return (
        ctx.request.headers.get("cf-connecting-ip") ||
        ctx.request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        null
      );
    },
    host: (ctx) => {
      const host = ctx.request.headers.get("x-forwarded-host") || ctx.request.url.hostname;
      return host.split(":")[0]; // Strip port
    },
    proto: (ctx) => {
      // Check multiple headers
      return ctx.request.headers.get("x-forwarded-proto") || ctx.request.headers.get("x-arr-ssl") === "on"
        ? "https"
        : "http";
    },
  })
);
```

## Accessing Extracted Values

### IP Address

The extracted IP address is stored in `ctx.locals[kIpAddr]`:

```typescript
import { kIpAddr } from "@minimajs/server";

app.get("/client-ip", (ctx) => {
  const clientIp = ctx.locals[kIpAddr];
  return { ip: clientIp };
});
```

### Host and Protocol

The extracted host and protocol are stored in `ctx.$metadata`:

```typescript
app.get("/request-info", (ctx) => {
  return {
    host: ctx.$metadata.host,
    proto: ctx.$metadata.proto,
    url: ctx.$metadata.url?.toString(),
  };
});
```

## Security Considerations

### Trust Only Known Proxies

In production, always specify which proxies to trust:

```typescript
// ❌ Avoid in production - trusts all proxies
app.register(proxy({ trustProxies: true }));

// ✅ Better - trust specific proxies
app.register(
  proxy({
    trustProxies: ["10.0.1.1", "10.0.1.2"],
  })
);
```

### Validate Proxy Depth

Set `proxyDepth` based on your infrastructure:

```typescript
// If you have 2 trusted proxies, skip both to get the real client IP
app.register(
  proxy({
    trustProxies: ["10.0.1.1", "10.0.1.2"],
    ip: { proxyDepth: 2 },
  })
);
```

### Header Spoofing

Untrusted proxies can spoof headers. Always validate `trustProxies`:

```typescript
app.register(
  proxy({
    trustProxies: (ctx) => {
      const ip = ctx.incomingMessage?.socket?.remoteAddress;
      // Only trust connections from your proxy server
      return ip === "10.0.1.1";
    },
  })
);
```

## Common Proxy Headers

| Header              | Purpose                 | Example Values              |
| ------------------- | ----------------------- | --------------------------- |
| `X-Forwarded-For`   | Client IP address chain | `203.0.113.195, 70.41.3.18` |
| `X-Forwarded-Proto` | Original protocol       | `https`, `http`             |
| `X-Forwarded-Host`  | Original hostname       | `example.com`               |
| `X-Real-IP`         | Client IP (NGINX)       | `203.0.113.195`             |
| `CF-Connecting-IP`  | Client IP (Cloudflare)  | `203.0.113.195`             |
| `X-Arr-SSL`         | SSL indicator (Azure)   | `on`                        |

## TypeScript Types

```typescript
import type { ProxyOptions, IpSettings, HostSettings, ProtoSettings } from "@minimajs/server/plugins";

const options: ProxyOptions = {
  trustProxies: true,
  ip: { proxyDepth: 1 },
  host: { stripPort: true },
  proto: {},
};
```
