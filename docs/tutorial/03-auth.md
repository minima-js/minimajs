---
title: "3. Authentication"
---

# Step 3: Authentication

We'll implement JWT authentication with access tokens (short-lived, in `Authorization` header) and refresh tokens (long-lived, in an `httpOnly` cookie).

## Auth Setup

Create `src/auth/index.ts`:

```typescript
import { headers } from "@minimajs/server";
import { createAuth, UnauthorizedError } from "@minimajs/auth";
import { cookies } from "@minimajs/cookie";
import jwt from "jsonwebtoken";
import { prisma } from "../database.js";

const ACCESS_SECRET = process.env.ACCESS_SECRET ?? "access-secret-change-in-prod";
const REFRESH_SECRET = process.env.REFRESH_SECRET ?? "refresh-secret-change-in-prod";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
}

// --- Token helpers ---

export function signAccessToken(user: AuthUser): string {
  return jwt.sign(user, ACCESS_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(userId: number): string {
  return jwt.sign({ id: userId }, REFRESH_SECRET, { expiresIn: "7d" });
}

// --- Auth plugin ---
// Reads the Bearer token from Authorization header, verifies it,
// and loads the user from the database.

export const [authPlugin, getUser] = createAuth(async () => {
  const authHeader = headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid Authorization header");
  }

  const token = authHeader.slice(7);

  let payload: AuthUser;
  try {
    payload = jwt.verify(token, ACCESS_SECRET) as AuthUser;
  } catch {
    throw new UnauthorizedError("Invalid or expired access token");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user) {
    throw new UnauthorizedError("User no longer exists");
  }

  return { id: user.id, email: user.email, name: user.name };
});

export { ACCESS_SECRET, REFRESH_SECRET };
```

## Auth Guards

Create `src/auth/guards.ts`:

```typescript
import { getUser } from "./index.js";
import { ForbiddenError } from "@minimajs/auth";
import { prisma } from "../database.js";
import { params } from "@minimajs/server";

// Requires a valid access token
export function authenticated() {
  getUser.required();
}

// Requires membership in the workspace from :workspaceId param
export async function workspaceMember() {
  const user = getUser.required();
  const workspaceId = Number(params.get("workspaceId"));

  const member = await prisma.member.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId } },
  });

  if (!member) {
    throw new ForbiddenError("You are not a member of this workspace");
  }

  return member;
}

// Requires admin or owner role in the workspace
export async function workspaceAdmin() {
  const member = await workspaceMember();

  if (!["owner", "admin"].includes(member.role)) {
    throw new ForbiddenError("Admin access required");
  }

  return member;
}
```

## Auth Routes

Create `src/auth/module.ts`:

```typescript
import { type Meta, type Routes, hook, body, abort } from "@minimajs/server";
import { cookies } from "@minimajs/cookie";
import { createBody } from "@minimajs/schema";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { prisma } from "../database.js";
import {
  signAccessToken,
  signRefreshToken,
  REFRESH_SECRET,
  type AuthUser,
} from "./index.js";
import bcrypt from "bcryptjs";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

const getLoginBody = createBody(loginSchema);
const getRegisterBody = createBody(registerSchema);

async function register() {
  const { name, email, password } = getRegisterBody();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    abort.badRequest("Email already in use");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  const accessToken = signAccessToken({ id: user.id, email: user.email, name: user.name });
  const refreshToken = signRefreshToken(user.id);

  cookies.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return { accessToken, user: { id: user.id, name: user.name, email: user.email } };
}

async function login() {
  const { email, password } = getLoginBody();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    abort.unauthorized("Invalid email or password");
  }

  const accessToken = signAccessToken({ id: user.id, email: user.email, name: user.name });
  const refreshToken = signRefreshToken(user.id);

  cookies.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7,
  });

  return { accessToken, user: { id: user.id, name: user.name, email: user.email } };
}

async function refresh() {
  const token = cookies.get("refresh_token");
  if (!token) {
    abort.unauthorized("No refresh token");
  }

  let payload: { id: number };
  try {
    payload = jwt.verify(token, REFRESH_SECRET) as { id: number };
  } catch {
    abort.unauthorized("Invalid or expired refresh token");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user) {
    abort.unauthorized("User not found");
  }

  const accessToken = signAccessToken({ id: user.id, email: user.email, name: user.name });
  return { accessToken };
}

function logout() {
  cookies.remove("refresh_token");
  return { success: true };
}

export const routes: Routes = {
  "POST /register": register,
  "POST /login": login,
  "POST /refresh": refresh,
  "POST /logout": logout,
};
```

### Register the auth plugin globally

Update `src/module.ts` to register the `authPlugin` so it runs on every request (but only throws in routes that call `getUser.required()`):

```typescript
import { type Meta, hook } from "@minimajs/server";
import { cors, gracefulShutdown } from "@minimajs/server/plugins";
import { authPlugin } from "./auth/index.js";
import { dbLifespan } from "./database.js";

export const meta: Meta = {
  plugins: [
    dbLifespan,
    cors({
      origin: process.env.ALLOWED_ORIGIN ?? "*",
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
    gracefulShutdown(),
    hook("request", ({ request, pathname }) => {
      console.log(`[${new Date().toISOString()}] ${request.method} ${pathname}`);
    }),
    // Auth runs on every request but only enforced where needed
    authPlugin,
  ],
};
```

## Install Missing Dependency

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

## Test It

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","password":"secret123"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123"}'
# → { "accessToken": "eyJ...", "user": { ... } }
```

---

Next: [Workspaces](./04-workspaces.md)
