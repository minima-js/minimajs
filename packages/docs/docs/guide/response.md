---
title: Response
sidebar_position: 5
---

## Return value as response

just return the value will be a response

```ts
app.get("/", () => {
  return "Hello world";
});
```

## Async

```ts
app.get("/", async () => {
  const response = await fetch("https://.../");
  return response.json();
});
```

## Streams

Any Readable streams are a valid response

```ts
import { createReadStream } from "node:fs";

app.get("/", async () => {
  return createReadStream("package.json");
});
```

# Generators

```ts
import { setTimeout as sleep } from "node:timers/promise";

async function* getDates() {
  yield new Date().toString();
  await sleep(1000);
  yield new Date().toString();
}

app.get("/", getDates);
```
