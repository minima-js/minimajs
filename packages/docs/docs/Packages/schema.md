---
title: Schema
sidebar_position: 1
---

## Installation

```sh
yarn add @minimajs/schema
```

```ts
import { createBody, string } from "@minimajs/schema";

const getUserPayload = createBody({
  name: string().required(),
});

function createUser() {
  const payload = getUserPayload();
  // save to data
  // payload = { name: string }
  return payload;
}

app.post("/users", createUser);
```
