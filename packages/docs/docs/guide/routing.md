---
title: Routing
sidebar_position: 3
---

## The Basic

```ts
app.get("/", () => "Welcome Home!");
```

That's it.

```bash
curl http://localhost:1234
> Welcome Home!
```

## Available methods

The router allows you to register routes that respond to any HTTP verb:

```ts
app.get("/", getUsers);
app.post("/", createUser);
app.put("/;user", updateUser);
app.patch("/;user", patchUser);
app.delete("/:user", deleteUser);
```

## Route Parameters

```ts
app.get("/users/:user", () => {
  const params = getParams<{ user: string }>();
  return { user: params.user };
});
```

You may define as many route parameters as required by your route:

```ts
app.get("/posts/:post/comments/:comment", () => {
  const params = getParams<{ post: string; comment: string }>();
  return [params.post, params.comment];
});
```

## Optionals parameters

```ts
app.get("/posts/:post?", () => {
  const params = getParams<{ post?: string }>();
  return [params.post ?? "not defined"];
});
```
