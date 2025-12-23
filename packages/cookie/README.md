# @minimajs/cookie

Type-safe cookie handling with validation for MinimaJS applications.

[![npm version](https://img.shields.io/npm/v/@minimajs/cookie.svg)](https://www.npmjs.com/package/@minimajs/cookie)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

<!-- Documentation is shared between package README and docs site -->
<!-- Source: packages/cookie/docs/cookie.md -->

# Cookie Management

The `@minimajs/cookie` package provides a type-safe API for managing HTTP cookies in your MinimaJS application. Built on top of `@fastify/cookie`, it offers secure cookie handling with validation and signing support using TypeScript namespace merging.

## Installation

```bash
npm install @minimajs/cookie
```

## Setup

Register the cookie plugin with your MinimaJS application:

```typescript
import { createApp } from "@minimajs/server";
import { plugin as cookiePlugin } from "@minimajs/cookie";

const app = createApp();

await app.register(cookiePlugin, {
  secret: "your-secret-key", // Required for signed cookies
  parseOptions: {}, // Optional parsing options
});
```

## Basic Usage

The `cookies()` function returns all cookies, and provides namespace methods for getting, setting, and removing individual cookies:

```typescript
import { cookies } from "@minimajs/cookie";

app.get("/example", () => {
  // Get all cookies
  const allCookies = cookies();
  // { "session-token": "abc123", "theme": "dark", ... }

  // Get a single cookie
  const sessionToken = cookies.get("session-token");

  // Set a cookie
  cookies.set("theme", "dark");

  // Remove a cookie
  cookies.remove("old-token");

  return { sessionToken };
});
```

## API Reference

### `cookies<T>()`

Returns all cookies as a record. Accepts an optional type parameter for type-safe access.

**Type Parameter:**

- `T` (optional): Type definition for the cookies object (defaults to `Record<string, string>`)

**Returns:** `T` - All cookies as a typed record

**Examples:**

```typescript
// Get all cookies (untyped)
const allCookies = cookies();
// Type: Record<string, string>

// Get all cookies with type parameter
interface MyCookies {
  sessionToken?: string;
  userId?: string;
  theme?: string;
}

const typedCookies = cookies<MyCookies>();
// Type: MyCookies
// Access with autocomplete: typedCookies.sessionToken
```

### `cookies.get(name, options?)`

Retrieves a single cookie by name.

**Parameters:**

- `name` (string): The cookie name
- `options` (optional): Configuration object
  - `required` (boolean): If true, throws an error if the cookie doesn't exist
  - `signed` (boolean): If true, validates and unsigns the cookie

**Returns:** `string | undefined` (or `string` if `required: true`)

**Examples:**

```typescript
// Get an optional cookie
const theme = cookies.get("theme");
// theme is string | undefined

// Get a required cookie (throws if not found)
const userId = cookies.get("user-id", { required: true });
// userId is string (guaranteed)

// Get a signed cookie
const sessionToken = cookies.get("session", {
  signed: true,
  required: true,
});
```

**Error Codes:**

- `COOKIE_NOT_FOUND`: Thrown when a required cookie is missing
- `COOKIE_NOT_VALID`: Thrown when a signed cookie validation fails

### `cookies.set(name, value, options?)`

Sets a cookie with optional configuration.

**Parameters:**

- `name` (string): The cookie name
- `value` (string): The cookie value
- `options` (optional): [CookieSerializeOptions](https://github.com/jshttp/cookie#options-1)
  - `domain` (string): Cookie domain
  - `path` (string): Cookie path (default: "/")
  - `maxAge` (number): Max age in seconds
  - `expires` (Date): Expiration date
  - `httpOnly` (boolean): HTTP only flag
  - `secure` (boolean): Secure flag
  - `sameSite` ("strict" | "lax" | "none"): SameSite policy
  - `signed` (boolean): Sign the cookie

**Example:**

```typescript
// Simple cookie
cookies.set("theme", "dark");

// Cookie with options
cookies.set("session-token", "abc123", {
  httpOnly: true,
  secure: true,
  maxAge: 3600, // 1 hour
  sameSite: "strict",
});

// Signed cookie
cookies.set("user-id", "12345", {
  signed: true,
  httpOnly: true,
});

// Cookie with expiration date
cookies.set("temp-token", "xyz789", {
  expires: new Date(Date.now() + 86400000), // 1 day
});
```

### `cookies.remove(name, options?)`

Removes a cookie by setting its expiration to the past.

**Parameters:**

- `name` (string): The cookie name
- `options` (optional): Same as `set()` options (useful for matching path/domain)

**Example:**

```typescript
// Remove a cookie
cookies.remove("session-token");

// Remove with specific path/domain
cookies.remove("session-token", {
  path: "/admin",
  domain: "example.com",
});
```

## Advanced Usage

### Type-Safe Cookies

Use TypeScript generics to get type-safe access to your cookies:

```typescript
interface UserCookies {
  sessionId?: string;
  userId?: string;
  theme?: "light" | "dark";
  locale?: string;
}

app.get("/profile", () => {
  const userCookies = cookies<UserCookies>();

  // TypeScript autocomplete and type checking
  const theme = userCookies.theme; // Type: "light" | "dark" | undefined
  const sessionId = userCookies.sessionId; // Type: string | undefined

  return { theme };
});
```

### Signed Cookies

Signed cookies provide tamper protection using HMAC signatures:

```typescript
// Set a signed cookie
cookies.set("user-session", "sensitive-data", {
  signed: true,
  httpOnly: true,
});

// Get and validate a signed cookie
const session = cookies.get("user-session", {
  signed: true,
  required: true,
});
// Throws COOKIE_NOT_VALID if signature is invalid
```

### Session Management Example

```typescript
import { cookies } from "@minimajs/cookie";

// Login endpoint
app.post("/login", () => {
  // Authenticate user...
  const userId = "12345";

  // Set session cookie
  cookies.set("session", userId, {
    httpOnly: true,
    secure: true,
    signed: true,
    maxAge: 86400, // 24 hours
    sameSite: "strict",
  });

  return { success: true };
});

// Protected endpoint
app.get("/profile", () => {
  // Get session
  const userId = cookies.get("session", {
    signed: true,
    required: true,
  });

  // Fetch user data...
  return { userId };
});

// Logout endpoint
app.post("/logout", () => {
  cookies.remove("session");
  return { success: true };
});
```

## Best Practices

1. **Use `httpOnly` for session cookies** to prevent XSS attacks:

   ```typescript
   cookies.set("session", token, { httpOnly: true });
   ```

2. **Use `secure` in production** to ensure cookies are only sent over HTTPS:

   ```typescript
   cookies.set("session", token, {
     secure: process.env.NODE_ENV === "production",
   });
   ```

3. **Sign sensitive cookies** to prevent tampering:

   ```typescript
   cookies.set("user-id", id, { signed: true });
   ```

4. **Set appropriate `sameSite` policies** to prevent CSRF:

   ```typescript
   cookies.set("session", token, { sameSite: "strict" });
   ```

5. **Use short `maxAge` for sensitive data**:
   ```typescript
   cookies.set("auth-token", token, { maxAge: 900 }); // 15 minutes
   ```

## License

MIT

## Links

- [Documentation](https://minima-js.github.io/packages/cookie)
- [GitHub](https://github.com/minima-js/minimajs)
- [npm](https://www.npmjs.com/package/@minimajs/cookie)
