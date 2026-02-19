---
title: "1. Project Setup"
---

# Step 1: Project Setup

## Install Dependencies

```bash
mkdir task-board && cd task-board
npm init -y
npm install @minimajs/server @minimajs/auth @minimajs/cookie @minimajs/schema @minimajs/multipart @minimajs/openapi
npm install prisma @prisma/client zod jsonwebtoken
npm install -D typescript tsx @types/node @types/jsonwebtoken
npx prisma init --datasource-provider sqlite
```

Update `package.json`:

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts"
  }
}
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true
  },
  "include": ["src"]
}
```

## Prisma Schema

Replace `prisma/schema.prisma` with:

```prisma
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

Run the migration:

```bash
npx prisma migrate dev --name init
```

## Entry Point

Create `src/index.ts`:

```typescript
import { createApp } from "@minimajs/server/node";

const app = createApp();

const address = await app.listen({ port: 3000 });
console.log(`Task Board API running at ${address}`);
```

At this point `npm run dev` should start without errors. The `createApp()` call auto-discovers all `module.ts` files under `src/` — we'll add those next.

---

Next: [Database & Root Module](./02-database.md)
