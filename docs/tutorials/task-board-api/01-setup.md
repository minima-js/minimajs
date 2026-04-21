---
title: "1. Project Setup"
---

# Step 1: Project Setup

## Step Outcome

After this step, you will have:

- a running Minima.js app on port `3000`
- a generated Prisma client
- the full initial database schema migrated to SQLite

## Install Dependencies

::: code-group

```bash [Terminal]
mkdir task-board && cd task-board
npm init -y
npm install @minimajs/server @minimajs/auth @minimajs/cookie @minimajs/schema @minimajs/multipart @minimajs/openapi
npm install prisma @prisma/client zod jsonwebtoken bcryptjs
npm install -D typescript tsc-watch @types/node @types/jsonwebtoken @types/bcryptjs
npx prisma init --datasource-provider sqlite
```

:::

Update `package.json`:

::: code-group

```json [package.json]
{
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsc-watch --onSuccess \"node dist/index.js\"",
    "start": "node dist/index.js"
  }
}
```

:::

Create `tsconfig.json`:

::: code-group

```json [tsconfig.json]
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

:::

## Prisma Schema

Replace `prisma/schema.prisma` with:

::: code-group

```prisma [prisma/schema.prisma]
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id           Int         @id @default(autoincrement())
  email        String      @unique
  name         String
  passwordHash String
  createdAt    DateTime    @default(now())

  memberships  Member[]
  tasks        Task[]      @relation("AssignedTasks")
}

model Workspace {
  id        Int      @id @default(autoincrement())
  name      String
  createdAt DateTime @default(now())

  members   Member[]
  boards    Board[]
}

model Member {
  id          Int       @id @default(autoincrement())
  role        String    @default("member") // "owner" | "admin" | "member"
  userId      Int
  workspaceId Int

  user        User      @relation(fields: [userId], references: [id])
  workspace   Workspace @relation(fields: [workspaceId], references: [id])

  @@unique([userId, workspaceId])
}

model Board {
  id          Int       @id @default(autoincrement())
  name        String
  workspaceId Int
  createdAt   DateTime  @default(now())

  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  tasks       Task[]
}

model Task {
  id          Int          @id @default(autoincrement())
  title       String
  description String?
  status      String       @default("todo") // "todo" | "in_progress" | "done"
  assigneeId  Int?
  boardId     Int
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  board       Board        @relation(fields: [boardId], references: [id])
  assignee    User?        @relation("AssignedTasks", fields: [assigneeId], references: [id])
  attachments Attachment[]
}

model Attachment {
  id        Int      @id @default(autoincrement())
  filename  String
  savedAs   String
  size      Int
  mimeType  String
  taskId    Int
  createdAt DateTime @default(now())

  task      Task     @relation(fields: [taskId], references: [id])
}
```

:::

Run the migration:

::: code-group

```bash [Terminal]
npx prisma migrate dev --name init
```

:::

Optional: open Prisma Studio to inspect your tables:

::: code-group

```bash [Terminal]
npx prisma studio
```

:::

## Entry Point

Create `src/index.ts`:

::: code-group

```typescript [src/index.ts]
import { createApp } from "@minimajs/server/node";

const app = createApp();

const address = await app.listen({ port: 3000 });
console.log(`Task Board API running at ${address}`);
```

:::

At this point `npm run dev` should start without errors. The `createApp()` call auto-discovers all `module.ts` files under `src/` — we'll add those next.

## Smoke Check

Run:

::: code-group

```bash [Terminal]
npm run dev
```

:::

Expected output:

::: code-group

```text [Output]
Task Board API running at http://localhost:3000
```

:::

And in a second terminal:

::: code-group

```bash [Terminal]
curl -i http://localhost:3000/
```

:::

Any HTTP response here is fine for now. The important part is that the process boots cleanly.

## Troubleshooting

- `prisma: command not found`: use `npx prisma ...` (not global prisma).
- ESM import errors: ensure `"type": "module"` is present in `package.json`.
- SQLite file issues: check `DATABASE_URL` in `.env` created by `prisma init`.

---

Next: [Database & Root Module](./02-database.md)
