## Requests

the request/response are globally accessible anywhere from request contexts.

```ts
import { getBody, getRequest } from "@minimajs/server";
app.get("/", () => {
  const request = getRequest();
  return request.url;
});
app.post("/", () => createUser(getBody()));
```
