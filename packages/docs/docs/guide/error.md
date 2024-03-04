---
title: Errors
sidebar_position: 6
---

## Abort

Aborting request

```ts
import { abort } from "@minimajs/server"; // import abort

async function findUser() {
  const params = getParams<{ user: string }>();
  const user = await User.findOne({ _id: params.user });
  if (!user) {
    abort("User doesn't exists", 404);
  }
  return user;
}

app.get("/users/:user", findUser);
```
