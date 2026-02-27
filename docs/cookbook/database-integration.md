---
title: Database Integration
sidebar_position: 3
---

# Database Integration with Prisma

A web application is rarely complete without a database. This recipe will show you how to integrate a database with your Minima.js application using [Prisma](https://www.prisma.io/), a popular open-source database toolkit for Node.js and TypeScript.

We will use Prisma to connect to a SQLite database, but the same principles apply to other databases supported by Prisma (like PostgreSQL, MySQL, etc.).

## Prerequisites

First, you need to install the required packages:

```bash
npm install prisma @prisma/client
```

## 1. Setting up Prisma

The first step is to initialize Prisma in your project.

```bash
npx prisma init --datasource-provider sqlite
```

This command will create a `prisma` directory with a `schema.prisma` file. This file contains your database schema.

Let's define a simple `User` model in `prisma/schema.prisma`:

```prisma [prisma/schema.prisma]
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
}
```

Now, you can use the Prisma CLI to create the database and generate the Prisma Client.

```bash
npx prisma migrate dev --name init
```

This command will:

1.  Create your SQLite database file.
2.  Create the `User` table in your database.
3.  Generate the Prisma Client library in `node_modules/@prisma/client`.

## 2. Connecting to the Database

We need to connect to the database when the application starts and disconnect when it stops. The `hook.lifespan` utility is perfect for this. It is best to register this in your root module.

::: code-group

```typescript [src/database.ts]
import { hook, logger } from "@minimajs/server";
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export const dbLifespan = hook.lifespan(async () => {
  await prisma.$connect();
  logger.info("Database connected");

  return async () => {
    await prisma.$disconnect();
    logger.info("Database disconnected");
  };
});
```

```typescript [src/module.ts]
import { type Meta } from "@minimajs/server";
import { dbLifespan } from "./database.js";

// Global database connection management
export const meta: Meta = {
  plugins: [dbLifespan],
};
```

```typescript [src/index.ts]
import { createApp } from "@minimajs/server/bun";

const app = createApp(); // Auto-discovers root module with dbLifespan
await app.listen({ port: 3000 });
```

:::

## 3. Using the Prisma Client in Routes

Now that we have connected to the database, we can use the Prisma Client in our route handlers to query the database.

::: code-group

```typescript [src/users/module.ts]
import { body, type Routes } from "@minimajs/server";
import { prisma } from "../database.js";

async function listUsers() {
  const users = await prisma.user.findMany();
  return users;
}

async function createUser() {
  const { name, email } = body<{ name: string; email: string }>();
  const newUser = await prisma.user.create({
    data: {
      name,
      email,
    },
  });
  return newUser;
}

export const routes: Routes = {
  "GET /": listUsers,
  "POST /": createUser,
};
```

:::

## 4. REST API Example

To keep our code organized, we encapsulate the database-related logic in a feature-based module structure.

```text
src/
├── database.ts       # Prisma instance & lifespan hook
├── module.ts         # Root module (global config)
├── index.ts          # Entry point
└── users/
    └── module.ts     # CRUD for /users
```

This approach makes our code more modular and easier to maintain. You now have a solid foundation for building database-driven applications with Minima.js and Prisma!

## See Also

- [Building with File-Based Modules](/core-concepts/modules)
- [Application Lifespan Hooks](/guides/hooks#hooklifespansetupfn)
- [Http Helpers](/guides/http)
