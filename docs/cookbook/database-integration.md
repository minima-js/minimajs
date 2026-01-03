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

```prisma title="prisma/schema.prisma"
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

We need to connect to the database when the application starts and disconnect when it stops. The `hook.lifespan` utility is perfect for this.

Let's create a `database.ts` file to manage the Prisma Client instance.

```typescript title="src/database.ts"
import { PrismaClient } from "@prisma/client";
import { hook } from "@minimajs/server";

export const prisma = new PrismaClient();

export const dbLifespan = hook.lifespan(async () => {
  await prisma.$connect();
  console.log("Database connected");

  return async () => {
    await prisma.$disconnect();
    console.log("Database disconnected");
  };
});
```

Now, we can register this `dbLifespan` hook in our main application file.

```typescript title="src/index.ts"
import { createApp } from "@minimajs/server";
import { dbLifespan } from "./database";

const app = createApp();

app.register(dbLifespan);

// ... your routes ...

await app.listen({ port: 3000 });
```

This ensures that the database connection is properly managed throughout the application's lifecycle.

## 3. Using the Prisma Client in Routes

Now that we have connected to the database, we can use the Prisma Client in our route handlers to query the database.

Let's create a route to get all users.

```typescript title="src/index.ts"
import { createApp } from "@minimajs/server";
import { dbLifespan, prisma } from "./database";

const app = createApp();

app.register(dbLifespan);

app.get("/users", async () => {
  const users = await prisma.user.findMany();
  return users;
});

await app.listen({ port: 3000 });
```

And a route to create a new user:

```typescript
import { body } from "@minimajs/server";

app.post("/users", async () => {
  const { name, email } = body<{ name: string; email: string }>();
  const newUser = await prisma.user.create({
    data: {
      name,
      email,
    },
  });
  return newUser;
});
```

## 4. Creating a Database Module

To keep our code organized, we can encapsulate the database-related logic in a module.

```typescript title="src/user/module.ts"
import { type App, body } from "@minimajs/server";
import { prisma } from "../database";

export async function userModule(app: App) {
  app.get("/users", async () => {
    const users = await prisma.user.findMany();
    return users;
  });

  app.post("/users", async () => {
    const { name, email } = body<{ name: string; email: string }>();
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
      },
    });
    return newUser;
  });
}
```

And then register the module in our main application file:

```typescript title="src/index.ts"
import { createApp } from "@minimajs/server";
import { dbLifespan } from "./database";
import { userModule } from "./user/module";

const app = createApp();

app.register(dbLifespan);
app.register(userModule);

await app.listen({ port: 3000 });
```

This approach makes our code more modular and easier to maintain. You now have a solid foundation for building database-driven applications with Minima.js and Prisma!
