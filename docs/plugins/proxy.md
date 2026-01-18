# Proxy

The Proxy plugin extracts client information from proxy headers when your application is behind a reverse proxy, load balancer, or CDN. It handles IP address extraction, protocol detection, and hostname reconstruction from common proxy headers like `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Forwarded-Host`.

## Installation

The plugin is included with the `@minimajs/server` package and can be imported from `@minimajs/server/plugins`.

```typescript
import { proxy } from "@minimajs/server/plugins";
```

## Usage

### Basic Usage

By default, calling `proxy()` with no arguments **trusts all proxies** and extracts IP, host, and protocol information from proxy headers:

```typescript
// Trust all proxies - extracts IP, host, and proto
app.register(proxy());

app.get("/client-info", (ctx) => {
  const clientIp = ctx.locals[kIpAddr];
  const { host, proto } = ctx.$metadata;
  return { ip: clientIp, host, proto };
});
```

### Disabling Features

Set any feature to `false` to disable it:

```typescript
// Only extract IP, disable host and proto
app.register(
  proxy({
    host: false,
    proto: false,
  })
);

// Only extract host and proto, disable IP
app.register(
  proxy({
    ip: false,
  })
);
```

## Configuration

### `trustProxies`

Determines whether to trust proxy headers from the incoming request. When omitted or `undefined`, **all proxies are trusted by default**.

- **Type**: `boolean | string[] | ((ctx: Context) => boolean) | undefined`
- **Default**: `undefined` (trusts all proxies)

```typescript
// Default - trust all proxies
app.register(proxy());

// Don't trust any proxies - extraction is disabled
app.register(proxy({ trustProxies: [] }));

// Trust specific proxy IP addresses (Node.js HTTP server only)
app.register(
  proxy({
    trustProxies: ["127.0.0.1", "10.0.0.0/8"],
  })
);

// Custom trust validator
app.register(
  proxy({
    trustProxies: (ctx) => {
      const ip = request.remoteAddr();
      return ip?.startsWith("10.") || ip === "127.0.0.1";
    },
  })
);
```

### `ip`

Configures IP address extraction from proxy headers. **Enabled by default**. Set to `false` to disable.

- **Type**: `IpSettings | ((ctx: Context) => string | null) | false`
- **Default**: Enabled with default settings

#### IpSettings Interface

```typescript
interface IpSettings {
  header?: string | string[]; // Custom header(s) to check
  depth?: number; // Number of IPs to skip from the beginning (implies depth strategy)
  strategy?: "first" | "last"; // Selection strategy for x-forwarded-for
}
```

#### Disabling IP Extraction

```typescript
app.register(
  proxy({
    ip: false, // Disable IP extraction completely
  })
);
```

#### Using Depth (Recommended for Multi-Proxy)

When you specify `depth`, the plugin automatically uses it to extract the IP at that position in the `X-Forwarded-For` chain:

```typescript
// Extract 2nd IP from X-Forwarded-For chain
// x-forwarded-for: "client, proxy1, proxy2" -> extracts "proxy1"
app.register(
  proxy({
    ip: { depth: 2 },
  })
);
```

#### Using Strategy

```typescript
// Get first IP (default)
app.register(
  proxy({
    ip: { strategy: "first" },
  })
);

// Get last IP
app.register(
  proxy({
    ip: { strategy: "last" },
  })
);
```

> **Note**: When `depth` is specified, it takes priority over `strategy` for extracting IPs from `X-Forwarded-For`.

#### Custom Headers

```typescript
// Check custom header(s) before standard headers
app.register(
  proxy({
    ip: {
      header: "cf-connecting-ip", // Cloudflare
    },
  })
);

// Try multiple headers in order
app.register(
  proxy({
    ip: {
      header: ["cf-connecting-ip", "x-real-ip", "x-forwarded-for"],
    },
  })
);
```

#### IP Extraction Priority

The plugin checks headers in this order:

1. **Custom headers** (if specified via `header` option)
2. **X-Forwarded-For** (with depth/strategy applied)
3. **X-Real-IP**
4. **Socket IP** (fallback)

#### Using Custom Callback

```typescript
app.register(
  proxy({
    ip: (ctx) => {
      // Custom logic
      return ctx.request.headers.get("cf-connecting-ip") || null;
    },
  })
);
```

### `host`

Configures hostname extraction from proxy headers. **Enabled by default**. Set to `false` to disable.

- **Type**: `HostSettings | ((ctx: Context) => string | null) | false`
- **Default**: Enabled with default settings

#### HostSettings Interface

```typescript
interface HostSettings {
  header?: string | string[]; // Header(s) to check (default: "x-forwarded-host")
}
```

#### Disabling Host Extraction

```typescript
app.register(
  proxy({
    host: false, // Disable host extraction
  })
);
```

#### Using Settings Object

```typescript
// Default header
app.register(
  proxy({
    host: {}, // Uses "x-forwarded-host"
  })
);

// Custom header
app.register(
  proxy({
    host: {
      header: "x-original-host",
    },
  })
);

// Multiple header fallback
app.register(
  proxy({
    host: {
      header: ["x-forwarded-host", "x-original-host"],
    },
  })
);
```

#### Host Extraction Priority

1. **Custom headers** (if specified via `header` option)
2. **Host header** (fallback)

#### Using Custom Callback

```typescript
app.register(
  proxy({
    host: (ctx) => {
      const host = ctx.request.headers.get("x-forwarded-host");
      return host?.split(":")[0] ?? "example.com"; // Strip port
    },
  })
);
```

### `proto`

Configures protocol extraction from proxy headers. **Enabled by default**. Set to `false` to disable.

- **Type**: `ProtoSettings | ((ctx: Context) => string) | false`
- **Default**: Enabled with default settings

#### ProtoSettings Interface

```typescript
interface ProtoSettings {
  header?: string | string[]; // Header(s) to check (default: "x-forwarded-proto")
}
```

#### Disabling Proto Extraction

```typescript
app.register(
  proxy({
    proto: false, // Disable proto extraction
  })
);
```

#### Using Settings Object

```typescript
// Default header
app.register(
  proxy({
    proto: {}, // Uses "x-forwarded-proto"
  })
);

// Multiple header fallback for different cloud providers
app.register(
  proxy({
    proto: {
      header: ["x-forwarded-proto", "cloudfront-forwarded-proto", "x-arr-ssl"],
    },
  })
);
```

#### Proto Extraction Priority

1. **Custom headers** (if specified via `header` option, checks for `"on"`, `"https"`, or `"http"`)
2. **SSL headers** (`x-forwarded-ssl` or `x-arr-ssl` with value `"on"`)
3. **Request URL protocol** (fallback)

#### Using Custom Callback

```typescript
app.register(
  proxy({
    proto: (ctx) => {
      const proto = ctx.request.headers.get("x-forwarded-proto");
      return proto === "on" ? "https" : "http";
    },
  })
);
```

})
);

````

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
````

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

### Default (Development)

```typescript
// Trust all proxies, extract all information
app.register(proxy());
```

### Behind NGINX

```typescript
app.register(
  proxy({
    trustProxies: ["127.0.0.1"], // Trust localhost NGINX
    ip: { depth: 1 },
  })
);
```

### Behind AWS ALB/CloudFront

```typescript
app.register(
  proxy({
    trustProxies: true,
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
    ip: { depth: 2 }, // Skip 2 proxies to get real client IP
    host: {
      header: ["x-forwarded-host", "x-original-host"],
    },
  })
);
```

### Cloudflare Setup

```typescript
app.register(
  proxy({
    trustProxies: true,
    ip: {
      header: "cf-connecting-ip", // Prioritize Cloudflare header
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
        ctx.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        null
      );
    },
    host: (ctx) => {
      const host = ctx.request.headers.get("x-forwarded-host") || ctx.request.url.hostname;
      return host.split(":")[0]; // Strip port
    },
    proto: (ctx) => {
      const proto = ctx.request.headers.get("x-forwarded-proto");
      const ssl = ctx.request.headers.get("x-arr-ssl");
      return proto === "https" || ssl === "on" ? "https" : "http";
    },
  })
);
```

## Accessing Extracted Values

### IP Address

```typescript
import { request } from "@minimajs/server";

app.get("/client-ip", (ctx) => {
  const clientIp = request.ip();
  return { ip: clientIp };
});
```

### Host and Protocol

The extracted host and protocol are stored in `ctx.$metadata`:

```typescript
import { request } from "@minimajs/request";
app.get("/request-info", (ctx) => {
  const info = request.url(); // type URL
  return {
    host: info.host,
    proto: info.protocol,
    url: info.href,
  };
});
```

## Security Considerations

### Trust Only Known Proxies in Production

By default, `proxy()` trusts all proxies. In production, always specify which proxies to trust:

```typescript
// ✅ Production - trust specific proxies
app.register(
  proxy({
    trustProxies: ["10.0.1.1", "10.0.1.2", "10.0.0.0/16"],
  })
);

// ✅ Or use custom validation
app.register(
  proxy({
    trustProxies: (ctx) => {
      const ip = ctx.incomingMessage?.socket?.remoteAddress; // in Node.js server
      return ip === "10.0.1.1";
    },
  })
);
```

### Validate Proxy Depth

Set `depth` based on your infrastructure to get the correct client IP:

```typescript
// If you have 2 trusted proxies, use depth: 2 to get the real client IP
// x-forwarded-for: "client, proxy1, proxy2"
// depth: 1 -> "client"
// depth: 2 -> "proxy1"
app.register(
  proxy({
    trustProxies: ["10.0.1.1", "10.0.1.2"],
    ip: { depth: 1 }, // Gets first IP (the actual client)
  })
);
```

### Header Spoofing

Without proper trust validation, clients can spoof headers:

```typescript
// ❌ Vulnerable - trusts all proxies
app.register(proxy());

// ✅ Protected - validates proxy source
app.register(
  proxy({
    trustProxies: (ctx) => {
      const ip = ctx.incomingMessage?.socket?.remoteAddress;
      return ip === "10.0.1.1"; // Only trust your actual proxy
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
