---
title: "6. Members & Roles"
---

# Step 6: Members & Roles

Members connect users to workspaces. Only workspace admins and owners can add or remove members.

## Module

Create `src/members/module.ts`:

```typescript
import { type Meta, type Routes, hook, params, abort } from "@minimajs/server";
import { createBody } from "@minimajs/schema";
import { z } from "zod";
import { prisma } from "../database.js";
import { getUser } from "../auth/index.js";
import { authenticated, workspaceMember, workspaceAdmin } from "../auth/guards.js";

const inviteBody = createBody(
  z.object({
    email: z.string().email(),
    role: z.enum(["admin", "member"]).default("member"),
  })
);

const updateRoleBody = createBody(
  z.object({ role: z.enum(["admin", "member"]) })
);

async function list() {
  const workspaceId = Number(params.get("workspaceId"));

  return prisma.member.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

async function invite() {
  await workspaceAdmin(); // only admins/owners can invite
  const workspaceId = Number(params.get("workspaceId"));
  const { email, role } = inviteBody();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) abort.notFound("No user with that email address");

  const existing = await prisma.member.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId } },
  });
  if (existing) abort.badRequest("User is already a member");

  return prisma.member.create({
    data: { userId: user.id, workspaceId, role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

async function updateRole() {
  await workspaceAdmin();
  const workspaceId = Number(params.get("workspaceId"));
  const memberId = Number(params.get("id"));
  const { role } = updateRoleBody();

  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) abort.notFound("Member not found");

  // Prevent demoting the last owner
  if (member.role === "owner") {
    const ownerCount = await prisma.member.count({
      where: { workspaceId, role: "owner" },
    });
    if (ownerCount <= 1) abort.badRequest("Cannot change role of the last owner");
  }

  return prisma.member.update({
    where: { id: memberId },
    data: { role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

async function remove() {
  await workspaceAdmin();
  const memberId = Number(params.get("id"));

  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) abort.notFound("Member not found");

  if (member.role === "owner") {
    abort.forbidden("Cannot remove a workspace owner");
  }

  await prisma.member.delete({ where: { id: memberId } });
  return { success: true };
}

export const meta: Meta = {
  plugins: [
    hook("request", authenticated),
    hook("request", workspaceMember),
  ],
};

export const routes: Routes = {
  "GET /": list,
  "POST /": invite,
  "PATCH /:id": updateRole,
  "DELETE /:id": remove,
};
```

`list` is available to any workspace member. The `invite`, `updateRole`, and `remove` handlers call `await workspaceAdmin()` themselves — this is the idiomatic way to apply per-handler authorization without splitting routes into separate modules.

---

Next: [Error Handling & Polish](./07-errors-polish.md)
