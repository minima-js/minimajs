---
title: Getting started
sidebar_position: 2
tags:
  - installation
---

## Installation

With yarn

```bash
yarn add @minimajs/server
```

Or with npm

```sh
npm i @minimajs/server
```

Let's starts with creating app

Directory tree

```
.
├── src
│   ├── index.ts // entry point
│   └── user // module user
│       └── index.ts // user module entry point
└── package.json
```

package.json

```json
{
  "name": "hello-nodejs",
  "type": "module" // this is important
}
```

src/index.ts

```ts
import { createApp } from "@minimajs/server";

const app = createApp();

app.get("/", () => "Welcome Home!");

await app.listen({ port: 1234 });
```

That's all!

Now either use `tsc` (Typescript) to compile your code or follow along

```sh
yarn add -D ebx
```

Add following inside your `package.json` file

```json
{
  "scripts": {
    "dev": "ebx src/index.ts -wsr",
    "build": "ebx src/index.ts",
    "start": "node dist/index.js"
  }
}
```

Starting the project

```sh
yarn dev
```

Server is listening on http://127.0.0.1:1234

```sh
curl http://127.0.0.1:1234/
> Welcome Home!
```

Read more about https://www.npmjs.com/package/ebx

## Customizing App

```ts
const app = createApp({
  disableLogging: false, // disable logging
});
```
