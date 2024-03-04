## Response

just return the value will be a response

```ts
app.get("/", () => {
  return "Hello world";
});
```

async response

```ts
app.get("/", async () => {
  const response = await fetch("https://.../");
  return response.json();
});
```

any readable stream or a generators are also a valid response

```ts
import { createReadStream } from "node:fs";

app.get("/", async () => {
  return createReadStream("package.json");
});
```

generator as response

```ts
import { setTimeout as sleep } from "node:timers/promise";

async function* getDates() {
  yield new Date().toString();
  await sleep(1000);
  yield new Date().toString();
}

app.get("/", getDates);
```
