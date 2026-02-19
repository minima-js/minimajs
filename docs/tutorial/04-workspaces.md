---
title: "4. Workspaces"
---

# Step 4: Workspaces

Workspaces are the top-level container. Only authenticated users can create workspaces, and only workspace members can access their boards and tasks.

## Module

Everything lives in a single `src/workspaces/module.ts`. The handler functions are defined in the file, and `export const routes` wires them to HTTP methods and paths.

```typescript
import { type Meta, type Routes, hook, params, abort } from "@minimajs/server";
import { createBody } from "@minimajs/schema";
import { z } from "zod";
import { prisma } from "../database.js";
import { getUser } from "../auth/index.js";
import { authenticated } from "../auth/guards.js";

const workspaceBody = createBody(
  z.object({ name: z.string().min(1).max(100) })
);

async function list() {
  const user = getUser.required();

  const memberships = await prisma.member.findMany({
    where: { userId: user.id },
    include: { workspace: true },
  });

  return memberships.map((m) => ({ ...m.workspace, role: m.role }));
}

async function find() {
  const id = Number(params.get("id"));
  const user = getUser.required();

  const member = await prisma.member.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId: id } },
    include: { workspace: true },
  });

  if (!member) abort.notFound("Workspace not found");
  return { ...member.workspace, role: member.role };
}

async function create() {
  const user = getUser.required();
  const { name } = workspaceBody();

  const workspace = await prisma.workspace.create({ data: { name } });

  // Creator becomes the owner
  await prisma.member.create({
    data: { userId: user.id, workspaceId: workspace.id, role: "owner" },
  });

  return workspace;
}

async function update() {
  const id = Number(params.get("id"));
  const user = getUser.required();
  const { name } = workspaceBody();

  const membership = await prisma.member.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId: id } },
  });
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    abort.forbidden("Admin access required");
  }

  return prisma.workspace.update({ where: { id }, data: { name } });
}

async function remove() {
  const id = Number(params.get("id"));
  const user = getUser.required();

  const membership = await prisma.member.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId: id } },
  });
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    abort.forbidden("Admin access required");
  }

  await prisma.workspace.delete({ where: { id } });
  return { success: true };
}

export const meta: Meta = {
  plugins: [
    hook("request", authenticated),
    descriptor(describe({ tags: ["Workspaces"] })),
  ],
};

export const routes: Routes = {
  "GET /": list,
  "GET /:id": find,
  "POST /": create,
  "PATCH /:id": update,
  "DELETE /:id": remove,
};
```

Notice how `hook("request", authenticated)` in `meta.plugins` runs before every route in this module. The admin check for `update` and `remove` is done inline in each handler since they need access to `:id` as the workspace ID.

## Test It

```bash
# Create a workspace (use the access token from login)
curl -X POST http://localhost:3000/workspaces \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Project"}'

# List your workspaces
curl http://localhost:3000/workspaces \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

Next: [Boards & Tasks](./05-boards-tasks.md)
