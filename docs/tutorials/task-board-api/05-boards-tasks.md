---
title: "5. Boards & Tasks"
---

# Step 5: Boards & Tasks

Boards live inside workspaces, and tasks live inside boards. This step also introduces file uploads for task attachments.

## Step Outcome

After this step, you will support:

- nested board routes under workspaces
- nested task routes under boards
- task pagination + status filtering
- attachment upload per task
- workspace membership checks for board-scoped task APIs

## Boards

Create `src/boards/module.ts`:

::: code-group

```typescript [src/boards/module.ts]
import { type Meta, type Routes, hook, params, abort } from "@minimajs/server";
import { descriptor } from "@minimajs/server/plugins";
import { describe } from "@minimajs/openapi";
import { createBody } from "@minimajs/schema";
import { z } from "zod";
import { prisma } from "../database.js";
import { authenticated, workspaceMember, workspaceAdmin } from "../auth/guards.js";

const boardBody = createBody(z.object({ name: z.string().min(1).max(100) }));

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
  await workspaceAdmin();
  const id = Number(params.get("id"));
  const workspaceId = Number(params.get("workspaceId"));
  const { name } = boardBody();

  const board = await prisma.board.findFirst({ where: { id, workspaceId } });
  if (!board) abort.notFound("Board not found");

  return prisma.board.update({ where: { id }, data: { name } });
}

async function remove() {
  await workspaceAdmin();
  const id = Number(params.get("id"));
  const workspaceId = Number(params.get("workspaceId"));

  const board = await prisma.board.findFirst({ where: { id, workspaceId } });
  if (!board) abort.notFound("Board not found");

  await prisma.board.delete({ where: { id } });
  return { success: true };
}

export const meta: Meta = {
  prefix: "/workspaces/:workspaceId/boards",
  plugins: [hook("request", authenticated), hook("request", workspaceMember), descriptor(describe({ tags: ["Boards"] }))],
};

export const routes: Routes = {
  "GET /": list,
  "GET /:id": find,
  "POST /": create,
  "PATCH /:id": update,
  "DELETE /:id": remove,
};
```

:::

Because this module exports `routes` (instead of a default registration function), keep module discovery enabled and use `meta.prefix` for nesting. The `prefix` above mounts this module at `/workspaces/:workspaceId/boards`.

Do the same for tasks in the next section.

## Tasks

Create `src/tasks/module.ts`:

::: code-group

```typescript [src/tasks/module.ts]
import { type Meta, type Routes, hook, params, abort } from "@minimajs/server";
import { descriptor } from "@minimajs/server/plugins";
import { describe } from "@minimajs/openapi";
import { createBody, createSearchParams } from "@minimajs/schema";
import { z } from "zod";
import { multipart, helpers } from "@minimajs/multipart";
import { prisma } from "../database.js";
import { authenticated, boardMember } from "../auth/guards.js";

const taskBody = createBody(
  z.object({
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    status: z.enum(["todo", "in_progress", "done"]).default("todo"),
    assigneeId: z.number().int().optional(),
  })
);

const paginationParams = createSearchParams({
  page: z.number({ coerce: true }).int().positive().default(1),
  limit: z.number({ coerce: true }).int().positive().max(100).default(20),
  status: z.enum(["todo", "in_progress", "done"]).optional(),
});

async function list() {
  const boardId = Number(params.get("boardId"));
  const { page, limit, status } = paginationParams();

  const where = { boardId, ...(status ? { status } : {}) };

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: { assignee: { select: { id: true, name: true } }, attachments: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.task.count({ where }),
  ]);

  return { tasks, total, page, limit };
}

async function find() {
  const boardId = Number(params.get("boardId"));
  const id = Number(params.get("id"));

  const task = await prisma.task.findFirst({
    where: { id, boardId },
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
  const boardId = Number(params.get("boardId"));
  const id = Number(params.get("id"));
  const data = taskBody();

  const existing = await prisma.task.findFirst({ where: { id, boardId } });
  if (!existing) abort.notFound("Task not found");

  return prisma.task.update({
    where: { id },
    data,
    include: { assignee: { select: { id: true, name: true } } },
  });
}

async function remove() {
  const boardId = Number(params.get("boardId"));
  const id = Number(params.get("id"));

  const existing = await prisma.task.findFirst({ where: { id, boardId } });
  if (!existing) abort.notFound("Task not found");

  await prisma.task.delete({ where: { id } });
  return { success: true };
}

async function uploadAttachment() {
  const boardId = Number(params.get("boardId"));
  const taskId = Number(params.get("id"));

  const task = await prisma.task.findFirst({ where: { id: taskId, boardId } });
  if (!task) abort.notFound("Task not found");

  const file = await multipart.file("file");
  if (!file) abort("No file uploaded", 400);

  const uploadDir = await helpers.ensurePath("./uploads", "attachments");
  const savedAs = await helpers.save(file, uploadDir);

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
  prefix: "/boards/:boardId/tasks",
  plugins: [hook("request", authenticated), hook("request", boardMember), descriptor(describe({ tags: ["Tasks"] }))],
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

:::

## What We Just Used

| Pattern                        | Where                                                     |
| ------------------------------ | --------------------------------------------------------- |
| `export const routes: Routes`  | All handlers wired directly in the module                 |
| `createBody` with Zod          | Request body validation in every handler                  |
| `createSearchParams`           | Pagination and filtering in `list()`                      |
| `multipart.file()`             | Single file upload in `uploadAttachment()`                |
| `helpers.save()`               | Persist file to disk with UUID filename                   |
| `abort.notFound()`             | Return 404 when a resource doesn't exist                  |
| `meta.prefix`                  | Mount module under nested resource paths                  |
| `hook("request", boardMember)` | Enforce workspace membership for board-scoped task routes |

## Smoke Check

::: code-group

```bash [Terminal]
# Create board in a workspace
curl -X POST http://localhost:3000/workspaces/1/boards \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Backend"}'

# Create task in board
curl -X POST http://localhost:3000/boards/1/tasks \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Design schema","status":"todo"}'

# List tasks with pagination
curl "http://localhost:3000/boards/1/tasks?page=1&limit=10&status=todo" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

# Upload attachment
curl -X POST http://localhost:3000/boards/1/tasks/1/attachments \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "file=@./README.md"
```

:::

## Troubleshooting

- `404 Board not found` while creating tasks: check `boardId` exists and belongs to expected workspace.
- Upload fails with missing file: field name must be exactly `file`.
- Unexpected empty task lists: verify `status` filter and `boardId` are correct.

---

Next: [Members & Roles](./06-members.md)
