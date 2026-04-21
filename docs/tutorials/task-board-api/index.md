---
title: "Tutorial: Task Board API"
sidebar_position: 1
---

# Tutorial: Build a Task Board API

Build a production-style Task Board API (Trello/Linear-style backend) from zero to deployment-ready structure using Minima.js.

By the end, you will have:

- JWT auth (access + refresh)
- Multi-workspace access control
- Nested boards/tasks routes
- File uploads for task attachments
- Consistent API error format
- OpenAPI docs and graceful shutdown

## Why This Tutorial Is Structured This Way

This tutorial follows a strict **copy → run → verify** loop:

1. Add code for one capability.
2. Run a smoke check.
3. Move to the next capability.

Each step has a clear outcome so you always know what “done” means before continuing.

## What You’ll Learn (Framework Coverage)

| Feature                            | Where it appears           |
| ---------------------------------- | -------------------------- |
| File-based module discovery        | All modules                |
| `meta.prefix` for nested resources | Boards + Tasks             |
| `@minimajs/auth`                   | Auth plugin and guards     |
| `@minimajs/cookie`                 | Refresh token cookie       |
| `@minimajs/schema` + Zod           | Body + query validation    |
| `@minimajs/multipart`              | Attachment uploads         |
| Prisma integration                 | All data access            |
| `hook.lifespan`                    | DB connect/disconnect      |
| `hook("request")`                  | Logging + route guards     |
| `hook("error")`                    | Centralized error behavior |
| `abort.*` helpers                  | Typed HTTP failures        |
| `cors` + `shutdown`                | Production runtime basics  |
| `routes: Routes` map               | Handler wiring per module  |

## Final Project Structure

::: code-group

```text [Project Tree]
task-board/
├── src/
│   ├── index.ts          # Entry + error serializers
│   ├── module.ts         # Global plugins
│   ├── database.ts       # Prisma + lifespan hook
│   ├── auth/
│   │   ├── index.ts      # createAuth + token helpers
│   │   ├── guards.ts     # authenticated/workspaceMember/boardMember/workspaceAdmin
│   │   └── module.ts     # /auth routes
│   ├── workspaces/
│   │   └── module.ts
│   ├── boards/
│   │   └── module.ts
│   ├── tasks/
│   │   └── module.ts
│   └── members/
│       └── module.ts
├── prisma/
│   └── schema.prisma
└── package.json
```

:::

## Prerequisites

- TypeScript basics
- REST API basics
- Node.js 20+

No prior Minima.js experience required.

## Steps

1. **[Project Setup](./01-setup.md)**: bootstrap app + Prisma schema
2. **[Database & Root Module](./02-database.md)**: lifespan hook + global plugins
3. **[Authentication](./03-auth.md)**: access/refresh flow + guards
4. **[Workspaces](./04-workspaces.md)**: first protected resource CRUD
5. **[Boards & Tasks](./05-boards-tasks.md)**: nested routes + uploads + pagination
6. **[Members & Roles](./06-members.md)**: role-based authorization
7. **[Error Handling & Polish](./07-errors-polish.md)**: uniform error shape + operational polish

## Working Method (Recommended)

- Keep one terminal running `npm run dev`.
- Keep one terminal for `curl` checks.
- After each step, run the step’s smoke test before continuing.

## Need To Present Minima.js?

Use the companion guide: [Tutorial Presentation Playbook](./presentation-playbook.md)

Start here: [Project Setup](./01-setup.md)
