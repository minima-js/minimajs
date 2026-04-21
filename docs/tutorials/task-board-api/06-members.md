---
title: "6. Members & Roles"
---

# Step 6: Members & Roles

Members connect users to workspaces. Only workspace admins and owners can add or remove members.

## Step Outcome

After this step, each workspace supports team management:

- list all members (for any member)
- invite users by email (admin/owner only)
- change member role between `admin` and `member`
- remove non-owner members

## Module

Create `src/members/module.ts`:

::: code-group

```typescript [src/members/module.ts]
import { type Meta, type Routes, hook, params, abort } from "@minimajs/server";
import { descriptor } from "@minimajs/server/plugins";
import { describe } from "@minimajs/openapi";
import { createBody } from "@minimajs/schema";
import { z } from "zod";
import { prisma } from "../database.js";
import { authenticated, workspaceMember, workspaceAdmin } from "../auth/guards.js";

const inviteBody = createBody(
  z.object({
    email: z.string().email(),
    role: z.enum(["admin", "member"]).default("member"),
  })
);

const updateRoleBody = createBody(z.object({ role: z.enum(["admin", "member"]) }));

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
  if (existing) abort("User is already a member", 400);

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
    if (ownerCount <= 1) abort("Cannot change role of the last owner", 400);
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
    abort("Cannot remove a workspace owner", 403);
  }

  await prisma.member.delete({ where: { id: memberId } });
  return { success: true };
}

export const meta: Meta = {
  plugins: [hook("request", authenticated), hook("request", workspaceMember), descriptor(describe({ tags: ["Members"] }))],
};

export const routes: Routes = {
  "GET /": list,
  "POST /": invite,
  "PATCH /:id": updateRole,
  "DELETE /:id": remove,
};
```

:::

`list` is available to any workspace member. The `invite`, `updateRole`, and `remove` handlers call `await workspaceAdmin()` themselves — this is the idiomatic way to apply per-handler authorization without splitting routes into separate modules.

## Smoke Check

::: code-group

```bash [Terminal]
# List members
curl http://localhost:3000/workspaces/1/members \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

# Invite a member
curl -X POST http://localhost:3000/workspaces/1/members \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@example.com","role":"member"}'

# Promote member (replace :id)
curl -X PATCH http://localhost:3000/workspaces/1/members/:id \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}'
```

:::

## Troubleshooting

- `404 No user with that email address`: invite target must register first.
- `403 Admin access required`: caller lacks admin/owner role in that workspace.
- Last owner protections are intentional to prevent orphaned workspaces.

---

Next: [Error Handling & Polish](./07-errors-polish.md)
