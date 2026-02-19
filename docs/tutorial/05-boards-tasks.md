---
title: "5. Boards & Tasks"
---

# Step 5: Boards & Tasks

Boards live inside workspaces, and tasks live inside boards. This step also introduces file uploads for task attachments.

## Boards

Create `src/boards/module.ts`:

```typescript
import { type Meta, type Routes, hook, params, abort } from "@minimajs/server";
import { descriptor } from "@minimajs/server/plugins";
import { describe } from "@minimajs/openapi";
import { createBody } from "@minimajs/schema";
import { z } from "zod";
import { prisma } from "../database.js";
import { authenticated, workspaceMember } from "../auth/guards.js";

const boardBody = createBody(
  z.object({ name: z.string().min(1).max(100) })
);

async function list() {
  const workspaceId = Number(params.get("workspaceId"));
  return prisma.board.findMany({ where: { workspaceId } });
}

async function find() {
  const id = Number(params.get("id"));
  const workspaceId = Number(params.get("workspaceId"));

  const board = await prisma.board.findFirst({ where: { id, workspaceId } });
  if (!board) abort.notFound("Board not found");
  return board;
}

async function create() {
  const workspaceId = Number(params.get("workspaceId"));
  const { name } = boardBody();
  return prisma.board.create({ data: { name, workspaceId } });
}

async function update() {
  const id = Number(params.get("id"));
  const { name } = boardBody();
  return prisma.board.update({ where: { id }, data: { name } });
}

async function remove() {
  const id = Number(params.get("id"));
  await prisma.board.delete({ where: { id } });
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
  "GET /:id": find,
  "POST /": create,
  "PATCH /:id": update,
  "DELETE /:id": remove,
};
```

The boards module sits under `src/boards/` but its routes are nested under `/workspaces/:workspaceId/boards`. Since Minima.js maps folder names to URL prefixes directly, register the boards module manually with the correct prefix in `src/index.ts`:

```typescript
import { createApp } from "@minimajs/server/node";
import { HttpError } from "@minimajs/server/error";

HttpError.toJSON = (err) => ({
  success: false,
  error: { message: err.response, statusCode: err.status },
});

const app = createApp({
  moduleDiscovery: {
    // Exclude boards and tasks — registered manually with nested prefixes
    ignored: ["boards", "tasks"],
  },
});

app.register(
  (await import("./boards/module.js")).default,
  { prefix: "/workspaces/:workspaceId/boards" }
);

app.register(
  (await import("./tasks/module.js")).default,
  { prefix: "/boards/:boardId/tasks" }
);

const address = await app.listen({ port: 3000 });
console.log(`Task Board API running at ${address}`);
```

## Tasks

Create `src/tasks/module.ts`:

```typescript
import { type Meta, type Routes, hook, params, abort } from "@minimajs/server";
import { createBody, createSearchParams } from "@minimajs/schema";
import { z } from "zod";
import { multipart, helpers } from "@minimajs/multipart";
import { prisma } from "../database.js";
import { authenticated, workspaceMember } from "../auth/guards.js";

const taskBody = createBody(
  z.object({
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    status: z.enum(["todo", "in_progress", "done"]).default("todo"),
    assigneeId: z.number().int().optional(),
  })
);

const paginationParams = createSearchParams(
  z.object({
    page: z.number({ coerce: true }).int().positive().default(1),
    limit: z.number({ coerce: true }).int().positive().max(100).default(20),
    status: z.enum(["todo", "in_progress", "done"]).optional(),
  })
);

async function list() {
  const boardId = Number(params.get("boardId"));
  const { page, limit, status } = paginationParams();

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where: { boardId, ...(status ? { status } : {}) },
      include: { assignee: { select: { id: true, name: true } }, attachments: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.task.count({ where: { boardId } }),
  ]);

  return { tasks, total, page, limit };
}

async function find() {
  const id = Number(params.get("id"));

  const task = await prisma.task.findUnique({
    where: { id },
    include: { assignee: { select: { id: true, name: true } }, attachments: true },
  });

  if (!task) abort.notFound("Task not found");
  return task;
}

async function create() {
  const boardId = Number(params.get("boardId"));
  const data = taskBody();

  return prisma.task.create({
    data: { ...data, boardId },
    include: { assignee: { select: { id: true, name: true } } },
  });
}

async function update() {
  const id = Number(params.get("id"));
  const data = taskBody();

  return prisma.task.update({
    where: { id },
    data,
    include: { assignee: { select: { id: true, name: true } } },
  });
}

async function remove() {
  const id = Number(params.get("id"));
  await prisma.task.delete({ where: { id } });
  return { success: true };
}

async function uploadAttachment() {
  const taskId = Number(params.get("id"));

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) abort.notFound("Task not found");

  const file = await multipart.file("file");
  if (!file) abort.badRequest("No file uploaded");

  await helpers.ensurePath("./uploads", "attachments");
  const savedAs = await helpers.save(file, "./uploads/attachments");

  return prisma.attachment.create({
    data: {
      taskId,
      filename: file.name,
      savedAs,
      size: file.size,
      mimeType: file.type,
    },
  });
}

export const meta: Meta = {
  plugins: [
    hook("request", authenticated),
    hook("request", workspaceMember),
  ],
};

export const routes: Routes = {
  "GET /": list,
  "GET /:id": find,
  "POST /": create,
  "PATCH /:id": update,
  "DELETE /:id": remove,
  "POST /:id/attachments": uploadAttachment,
};
```

## What We Just Used

| Pattern | Where |
|---|---|
| `export const routes: Routes` | All handlers wired directly in the module |
| `createBody` with Zod | Request body validation in every handler |
| `createSearchParams` | Pagination and filtering in `list()` |
| `multipart.file()` | Single file upload in `uploadAttachment()` |
| `helpers.save()` | Persist file to disk with UUID filename |
| `abort.notFound()` | Return 404 when a resource doesn't exist |
| `hook("request", workspaceMember)` | Scope guard for the entire module |

---

Next: [Members & Roles](./06-members.md)
