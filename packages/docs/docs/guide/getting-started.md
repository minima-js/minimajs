---
title: Getting started
sidebar_position: 2
---

## Installation

```bash
yarn add @minimajs/server
```

## Let's start with server

```ts
import { createApp } from "@minimajs/server";

const app = createApp();
await app.listen({ port: 1234 });
```

Server is listening on http://127.0.0.1:1234

## Customizing App

```ts
const app = createApp({
  disableLogging: false, // disable logging
});
```
