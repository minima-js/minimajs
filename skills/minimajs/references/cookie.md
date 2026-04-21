# @minimajs/cookie — Cookie Reference

Type-safe cookie management. The `cookies()` function follows the callable namespace pattern — call it to get all cookies, or use its methods for individual operations.

## Basic usage

```typescript
import { cookies } from "@minimajs/cookie";

// Get all cookies
const all = cookies(); // Record<string, string>

// Get one cookie
const token = cookies.get("session-token"); // string | undefined

// Set a cookie
cookies.set("theme", "dark");

// Set with options
cookies.set("session", userId, {
  httpOnly: true,
  secure: true,
  maxAge: 3600, // seconds
  sameSite: "strict",
});

// Remove a cookie
cookies.remove("session-token");

// Remove with path/domain matching
cookies.remove("session-token", { path: "/admin" });
```

## Type-safe cookies

```typescript
interface AppCookies {
  sessionId?: string;
  theme?: "light" | "dark";
  locale?: string;
}

const c = cookies<AppCookies>();
// c.theme is "light" | "dark" | undefined
```

## `cookies.set()` options

All standard cookie attributes:

| Option | Type | Notes |
|---|---|---|
| `httpOnly` | boolean | Block JS access — use for session tokens |
| `secure` | boolean | HTTPS only — use in production |
| `sameSite` | `"strict"` \| `"lax"` \| `"none"` | CSRF protection |
| `maxAge` | number | Seconds until expiry |
| `expires` | Date | Absolute expiry date |
| `path` | string | Default: `"/"` |
| `domain` | string | Cookie domain |

## Common patterns

### Session login/logout

```typescript
// POST /login
cookies.set("session", userId, { httpOnly: true, secure: true, maxAge: 86400, sameSite: "strict" });

// POST /logout
cookies.remove("session");
```

### Auth guard using cookies

```typescript
import { cookies } from "@minimajs/cookie";
import { abort } from "@minimajs/server";

export function getSessionUser() {
  const sessionId = cookies.get("session");
  if (!sessionId) abort(401);
  return db.sessions.get(sessionId);
}
```
