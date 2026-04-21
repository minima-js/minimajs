# Proxy

The Proxy plugin extracts client information from proxy headers when your application is behind a reverse proxy, load balancer, or CDN. It handles IP address extraction, protocol detection, and hostname reconstruction from common proxy headers like `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Forwarded-Host`.

## Installation

The plugin is included with the `@minimajs/server` package and can be imported from `@minimajs/server/plugins`.

```typescript
import { proxy } from "@minimajs/server/plugins";
```

## Usage

### Basic Usage

By default, calling `proxy()` with no arguments **trusts all proxies** and extracts IP, host, and protocol information from proxy headers. It is recommended to register it in your root module.

::: code-group

```typescript [src/module.ts]
import { proxy } from "@minimajs/server/plugins";
import { request, type Routes, type Meta } from "@minimajs/server";

// Trust all proxies - extracts IP, host, and proto
export const meta: Meta = {
  plugins: [proxy()],
};

function getClientInfo() {
  const clientIp = request.ip();
  const info = request.url();
  return {
    ip: clientIp,
    host: info.host,
    proto: info.protocol,
  };
}

export const routes: Routes = {
  "GET /client-info": getClientInfo,
};
```

:::

### Disabling Features

Set any feature to `false` to disable it within your module configuration:

::: code-group

```typescript [src/module.ts]
import { proxy } from "@minimajs/server/plugins";
import { type Meta } from "@minimajs/server";

export const meta: Meta = {
  plugins: [
    proxy({
      host: false, // Only extract IP, disable host and proto
      proto: false,
    }),
  ],
};
```

:::

## Configuration

### `trustProxies`

Determines whether to trust proxy headers from the incoming request. When omitted or `undefined`, **all proxies are trusted by default**.

- **Type**: `boolean | string[] | ((ctx: Context) => boolean) | undefined`
- **Default**: `undefined` (trusts all proxies)

::: code-group

```typescript [src/module.ts]
import { proxy } from "@minimajs/server/plugins";
import { request, type Meta } from "@minimajs/server";

export const meta: Meta = {
  plugins: [
    // Don't trust any proxies - extraction is disabled
    proxy({ trustProxies: [] }),

    // Trust specific proxy IP addresses (Node.js runtime only)
    proxy({
      trustProxies: ["127.0.0.1", "10.0.0.0/8"],
    }),

    // Custom trust validator
    proxy({
      trustProxies: (ctx) => {
        const ip = request.remoteAddr();
        return ip?.startsWith("10.") || ip === "127.0.0.1";
      },
    }),
  ],
};
```

:::

### `ip`

Configures IP address extraction from proxy headers. **Enabled by default**. Set to `false` to disable.

- **Type**: `IpSettings | ((ctx: Context) => string | null) | false`
- **Default**: Enabled with default settings

#### IpSettings Interface

```typescript
interface IpSettings {
  header?: string | string[]; // Custom header(s) to check
  depth?: number; // 1-based index from the right (server-side) of the X-Forwarded-For header.
  strategy?: "first" | "last"; // Selection strategy for x-forwarded-for
}
```

#### Disabling IP Extraction

```typescript
export const meta: Meta = {
  plugins: [proxy({ ip: false })],
};
```

#### Using Depth (Recommended for Multi-Proxy)

When you specify `depth`, the plugin automatically uses it to extract the IP at that position in the `X-Forwarded-For` chain. `depth` is a 1-based index from the right (server-side).

For an `X-Forwarded-For` header of `"client, proxy1, proxy2"`:

- `depth: 1` extracts `proxy2`
- `depth: 2` extracts `proxy1`
- `depth: 3` extracts `client`

```typescript
// Extract the client IP, assuming 2 trusted proxies
// x-forwarded-for: "client, proxy1, proxy2"
export const meta: Meta = {
  plugins: [
    proxy({
      ip: { depth: 3 },
    }),
  ],
};
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
export const meta: Meta = {
  plugins: [proxy({ host: false })],
};
```

#### Using Settings Object

```typescript
// Multiple header fallback
export const meta: Meta = {
  plugins: [
    proxy({
      host: {
        header: ["x-forwarded-host", "x-original-host"],
      },
    }),
  ],
};
```

### `proto`

Configures protocol extraction from proxy headers. Enabled by default, set to `false` to disable.

- **Type**: `ProtoSettings | ProtoCallback | false`
- **Default**: Enabled (uses default settings)

> **Note**: `proto` and `host` are always extracted together. To disable both, you must set both `proto: false` and `host: false`.

#### Disabling Proto Extraction

```typescript
export const meta: Meta = {
  plugins: [
    proxy({
      trustProxies: true,
      proto: false, // Must also set host: false to disable both
      host: false,
    }),
  ],
};
```

## Complete Examples

### Default (Development)

::: code-group

```typescript [src/module.ts]
import { proxy } from "@minimajs/server/plugins";
import { type Meta } from "@minimajs/server";

// Trust all proxies, extract all information
export const meta: Meta = {
  plugins: [proxy()],
};
```

:::

### Behind NGINX

::: code-group

```typescript [src/module.ts]
import { proxy } from "@minimajs/server/plugins";
import { type Meta } from "@minimajs/server";

export const meta: Meta = {
  plugins: [
    proxy({
      trustProxies: ["127.0.0.1"], // Trust localhost NGINX
      ip: { depth: 2 }, // If NGINX is the only proxy, client IP is at depth 2
    }),
  ],
};
```

:::

### Behind Multiple Proxies

::: code-group

```typescript [src/module.ts]
import { proxy } from "@minimajs/server/plugins";
import { type Meta } from "@minimajs/server";

export const meta: Meta = {
  plugins: [
    proxy({
      trustProxies: ["10.0.0.1", "10.0.0.2"], // Trust specific proxies
      ip: { depth: 3 }, // If there are 2 proxies, client IP is at depth 3
      host: {
        header: ["x-forwarded-host", "x-original-host"],
      },
    }),
  ],
};
```

:::

### Custom Logic for All Options

::: code-group

```typescript [src/module.ts]
import { proxy } from "@minimajs/server/plugins";
import { type Meta } from "@minimajs/server";

export const meta: Meta = {
  plugins: [
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
    }),
  ],
};
```

:::

## Accessing Extracted Values

### IP Address

::: code-group

```typescript [src/users/module.ts]
import { request, type Routes } from "@minimajs/server";

function getClientIp() {
  const clientIp = request.ip();
  return { ip: clientIp };
}

export const routes: Routes = {
  "GET /client-ip": getClientIp,
};
```

:::

### Host and Protocol

The extracted host and protocol are used to reconstruct the `request.url()` object:

::: code-group

```typescript [src/system/module.ts]
import { request, type Routes } from "@minimajs/server";

function getRequestInfo() {
  const info = request.url(); // type URL
  return {
    host: info.host,
    proto: info.protocol,
    url: info.href,
  };
}

export const routes: Routes = {
  "GET /request-info": getRequestInfo,
};
```

:::

## Security Considerations

### Trust Only Known Proxies in Production

By default, `proxy()` trusts all proxies. In production, always specify which proxies to trust via `meta.plugins` in your root module.

::: code-group

```typescript [src/module.ts]
import { proxy } from "@minimajs/server/plugins";
import { type Meta } from "@minimajs/server";

export const meta: Meta = {
  plugins: [
    // ✅ Production - trust specific proxies
    proxy({
      trustProxies: ["10.0.1.1", "10.0.1.2", "10.0.0.0/16"],
    }),
  ],
};
```

:::

### Header Spoofing

Without proper trust validation, clients can spoof headers. Always ensure `trustProxies` is correctly configured to only validate headers from your actual infrastructure.

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
  ip: { depth: 1 },
  host: { header: "x-forwarded-host" },
  proto: {},
};
```
