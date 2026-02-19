---
title: "Tutorial: Task Board API"
sidebar_position: 1
---

# Tutorial: Build a Task Board API

In this tutorial you'll build a **Task Board API** — a simplified Trello/Linear-style backend — from scratch using Minima.js. By the end you'll have a fully working REST API that covers the full breadth of the framework.

## What You'll Build

A multi-workspace task management API with:

- Workspaces that contain boards
- Boards that contain tasks
- Members with role-based access
- Task attachments (file uploads)
- JWT authentication with refresh tokens

## What You'll Learn

| Feature | Where it appears |
|---|---|
| File-based module discovery | Every domain module |
| `@minimajs/auth` | Auth guard on protected routes |
| `@minimajs/cookie` | Refresh token storage |
| `@minimajs/schema` + Zod | Request body/params validation |
| `@minimajs/multipart` | Task attachment uploads |
| Prisma database integration | All data operations |
| `hook.lifespan` | DB connect/disconnect |
| `hook("request")` | Request logging, auth guard |
| `hook("error")` | Centralized error formatting |
| `abort` helpers | `notFound`, `forbidden`, `badRequest` |
| `cors` plugin | API access from browsers |
| `export const routes: Routes` | Handler-to-route wiring in every module |
| Graceful shutdown plugin | Production readiness |

## Project Structure

```
task-board/
├── src/
│   ├── index.ts          # Entry point + error format overrides
│   ├── module.ts         # Root module (global plugins)
│   ├── database.ts       # Prisma instance + lifespan hook
│   ├── auth/
│   │   ├── index.ts      # createAuth setup + token helpers
│   │   ├── guards.ts     # authenticated, workspaceMember, workspaceAdmin
│   │   └── module.ts     # POST /auth/register|login|refresh|logout
│   ├── workspaces/
│   │   └── module.ts     # GET|POST|PATCH|DELETE /workspaces
│   ├── boards/
│   │   └── module.ts     # /workspaces/:workspaceId/boards
│   ├── tasks/
│   │   └── module.ts     # /boards/:boardId/tasks + attachments
│   └── members/
│       └── module.ts     # /workspaces/:workspaceId/members
├── prisma/
│   └── schema.prisma
└── package.json
```

## Prerequisites

Basic TypeScript and REST API knowledge. You don't need prior Minima.js experience — this tutorial builds from the ground up.

## Tutorial Steps

1. **[Project Setup](./01-setup.md)** — Install dependencies, configure Prisma, wire up the entry point
2. **[Database & Root Module](./02-database.md)** — Prisma schema, lifespan hook, global plugins
3. **[Authentication](./03-auth.md)** — JWT login, refresh tokens, cookies, auth guards
4. **[Workspaces](./04-workspaces.md)** — CRUD with controllers, validation, and authorization
5. **[Boards & Tasks](./05-boards-tasks.md)** — Nested resources, file uploads, pagination
6. **[Members & Roles](./06-members.md)** — Role-based access, permission guards
7. **[Error Handling & Polish](./07-errors-polish.md)** — Centralized error format, CORS, graceful shutdown

Let's get started → [Project Setup](./01-setup.md)
