## Minima.js vs NestJS

### 1. Philosophy

#### NestJS

> “Let’s bring Angular + Spring Boot + annotations into Node.js because… reasons.”

- Built for people who miss Java
- Abstracts JavaScript until it barely looks like JavaScript
- Assumes:
  - DI container
  - Reflection
  - Metadata / Classes everywhere

#### Minima.js

> “JavaScript already works. Let’s not fight it.”

- Embraces:
  - Functions
  - Composition
  - Explicit execution
  - Runtime context (ALS)
- No fake "enterprise" layers

#### Verdict:

NestJS fights the language. Minima respects it.

---

### Request Context Access

**NestJS**

Accessing the request object requires framework-specific APIs and request-scoped providers:

```ts
@Injectable({ scope: Scope.REQUEST })
export class RequestContextService {
  constructor(@Inject(REQUEST) private readonly req: Request) {}

  getRequest() {
    return this.req;
  }
}
```

This relies on:

- Decorators
- Reflection
- Request-scoped dependency injection
- Framework lifecycle management

---

**Minima.js**

Request and response are available anywhere using AsyncLocalStorage:

```ts
const { req, res } = context();
```

- No decorators
- No container
- Works across async boundaries

---

### Dependency Injection

**NestJS**

Dependencies are resolved through a container:

```ts
@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService) {}

  authenticate() {
    // ...
  }
}
```

This requires:

- Class-based design
- Provider registration
- Container bootstrapping for tests

---

**Minima.js**

Dependencies are explicit and local:

```typescript
// services/auth.ts
export function login(user: User) {
  // do set authentication
}
```

---

### Authorization

**NestJS**

```ts
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    return !!req.user;
  }
}
```

Guards are tightly coupled to the NestJS runtime.

---

**Minima.js**

Authorization logic is a simple, composable function.

```ts
// auth/services.ts
import { headers, abort } from "@minimajs/server";

const isAuthenticated = () => {
  if (!headers.get("Authorization")) {
    abort({ message: "Not Authenticated" }, 401);
  }
};
```

These functions can be applied as middleware using the composition API.

```ts
import { plugin, hook, compose } from "@minimajs/server";

// Wrap the auth logic in a plugin
const authPlugin = plugin((app) => {
  app.register(hook("request", isAuthenticated));
});

function adminModule(app: App) {
  app.get("/profile", () => ({ user: "admin" }));
}

// Apply the plugin to the module
const protectedAdminModule = compose.create(authPlugin)(adminModule);
app.register(protectedAdminModule);
```

---

### Summary

NestJS emphasizes **framework-managed abstraction**.
Minima.js emphasizes **explicit control and simplicity**.

The result is less magic, fewer concepts, and clearer execution flow.
