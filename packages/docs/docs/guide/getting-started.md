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

```ts
import { createApp } from "@minimajs/server";

const app = createApp();

app.get("/", () => "Welcome Home!");

await app.listen({ port: 1234 });
```

Server is listening on http://127.0.0.1:1234

```sh
curl http://127.0.0.1:1234/
> Welcome Home!
```

## Customizing App

```ts
const app = createApp({
  disableLogging: false, // disable logging
});
```
